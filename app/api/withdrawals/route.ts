import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

const MIN_WITHDRAWAL_MINOR = 5000;
const WITHDRAWAL_FEE_MINOR = 0;

type Destination = { bankName?: string; accountNumber?: string; accountName?: string };

export async function GET() {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  try {
    const withdrawals = await sql\`
      select id, amount_minor, fee_minor, net_amount_minor, currency, method, status,
             destination, requested_at, processed_at, failure_reason
      from public.withdrawals
      where user_id = \${user.id}
      order by requested_at desc
      limit 20
    \`;
    return Response.json({ withdrawals });
  } catch {
    return Response.json({ error: "Unable to load withdrawals" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const { data } = await auth.getSession();
  const user = data?.user;
  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });

  let body: { amountMinor?: number; destination?: Destination };
  try { body = await request.json(); } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const amountMinor = Number(body.amountMinor);
  const destination = body.destination ?? {};
  if (!Number.isInteger(amountMinor) || amountMinor < MIN_WITHDRAWAL_MINOR) {
    return Response.json({ error: "Minimum withdrawal is ₦50.00" }, { status: 400 });
  }
  if (!/^\\d{10}$/.test(destination.accountNumber ?? "")) {
    return Response.json({ error: "Enter a valid 10-digit Nigerian bank account number" }, { status: 400 });
  }
  if (!destination.bankName?.trim() || !destination.accountName?.trim()) {
    return Response.json({ error: "Bank name and account name are required" }, { status: 400 });
  }

  try {
    const [rows] = await sql.transaction([
      sql\`
        with debited as (
          update public.wallets
          set available_minor = available_minor - \${amountMinor}, updated_at = now()
          where user_id = \${user.id} and available_minor >= \${amountMinor}
          returning user_id, currency
        ),
        created as (
          insert into public.withdrawals (
            user_id, amount_minor, fee_minor, net_amount_minor, currency, method, status, destination
          )
          select user_id, \${amountMinor}, \${WITHDRAWAL_FEE_MINOR}, \${amountMinor - WITHDRAWAL_FEE_MINOR},
                 currency, 'bank', 'pending', \${JSON.stringify({
                   bankName: destination.bankName.trim(),
                   accountNumber: destination.accountNumber,
                   accountName: destination.accountName.trim(),
                 })}::jsonb
          from debited
          returning id, amount_minor, fee_minor, net_amount_minor, currency, status, requested_at
        ),
        ledgered as (
          insert into public.ledger_entries (
            user_id, withdrawal_id, entry_type, direction, amount_minor, currency, reference, description, metadata
          )
          select user_id, id, 'withdrawal', 'debit', amount_minor, currency,
                 'withdrawal:' || id::text, 'Withdrawal request', '{"source":"taskcash_mvp"}'::jsonb
          from created
          returning withdrawal_id
        )
        select id, amount_minor, fee_minor, net_amount_minor, currency, status, requested_at
        from created
      \`,
    ]);

    const row = rows[0];
    if (!row) return Response.json({ error: "Insufficient available balance" }, { status: 400 });
    return Response.json({ ok: true, withdrawal: row, message: "Withdrawal request submitted for review." });
  } catch {
    return Response.json({ error: "Unable to create withdrawal request" }, { status: 503 });
  }
}
