import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: Request, { params }: Params) {
  const { data } = await auth.getSession();
  const user = data?.user;

  if (!user) return Response.json({ error: "Authentication required" }, { status: 401 });
  if (user.role !== "admin") return Response.json({ error: "Admin access required" }, { status: 403 });

  const { id } = await params;
  let body: { action?: "approve" | "cancel" };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.action || !["approve", "cancel"].includes(body.action)) {
    return Response.json({ error: "Action must be approve or cancel" }, { status: 400 });
  }

  try {
    const [rows] = await sql.transaction([
      sql`
        with target as (
          select id, user_id, amount_minor, currency
          from public.withdrawals
          where id = ${id}
            and status = 'pending'
          limit 1
        ),
        changed as (
          update public.withdrawals w
          set status = ${body.action === "approve" ? "processing" : "cancelled"},
              updated_at = now(),
              processed_at = case when ${body.action === "cancel"} then now() else null end
          from target t
          where w.id = t.id
          returning w.id, w.user_id, w.amount_minor, w.currency, w.status
        ),
        restored as (
          update public.wallets w
          set available_minor = w.available_minor + c.amount_minor,
              updated_at = now()
          from changed c
          where ${body.action === "cancel"}
            and w.user_id = c.user_id
          returning w.user_id
        ),
        reversal as (
          insert into public.ledger_entries (
            user_id, withdrawal_id, entry_type, direction, amount_minor, currency,
            reference, description, metadata
          )
          select
            user_id, id, 'withdrawal_reversal', 'credit', amount_minor, currency,
            'withdrawal_reversal:' || id::text, 'Cancelled withdrawal returned to wallet',
            '{"source":"taskcash_mvp"}'::jsonb
          from changed
          where ${body.action === "cancel"}
          on conflict (reference) do nothing
          returning withdrawal_id
        )
        select id, user_id, amount_minor, currency, status
        from changed
      `,
    ]);

    const row = rows[0];
    if (!row) {
      return Response.json(
        { error: "Withdrawal not found or already processed" },
        { status: 409 },
      );
    }

    return Response.json({
      ok: true,
      withdrawal: row,
      message:
        body.action === "approve"
          ? "Withdrawal approved for payout processing. No money has been sent by this MVP."
          : "Withdrawal cancelled and balance restored.",
    });
  } catch {
    return Response.json({ error: "Unable to update withdrawal" }, { status: 503 });
  }
}
