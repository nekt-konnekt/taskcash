import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

export async function GET() {
  const { data } = await auth.getSession();
  const user = data?.user;

  if (!user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  if (user.role !== "admin") {
    return Response.json({ error: "Admin access required" }, { status: 403 });
  }

  try {
    const withdrawals = await sql`
      select
        w.id,
        w.user_id,
        p.display_name,
        u.email,
        w.amount_minor,
        w.fee_minor,
        w.net_amount_minor,
        w.currency,
        w.method,
        w.status,
        w.destination,
        w.requested_at,
        w.updated_at
      from public.withdrawals w
      left join public.profiles p on p.id = w.user_id
      left join neon_auth."user" u on u.id = w.user_id
      where w.status in ('pending', 'processing', 'review')
      order by w.requested_at asc
      limit 100
    `;

    return Response.json({ withdrawals });
  } catch {
    return Response.json({ error: "Unable to load withdrawal queue" }, { status: 503 });
  }
}
