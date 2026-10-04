import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

export async function GET() {
  const { session, user } = await auth.getSession();

  if (!session || !user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  try {
    const rows = await sql`
      select
        currency,
        available_minor,
        pending_minor,
        lifetime_earned_minor,
        lifetime_withdrawn_minor
      from public.wallets
      where user_id = ${user.id}
      limit 1
    `;

    const wallet = rows[0] ?? {
      currency: "NGN",
      available_minor: 0,
      pending_minor: 0,
      lifetime_earned_minor: 0,
      lifetime_withdrawn_minor: 0,
    };

    return Response.json({ wallet });
  } catch {
    return Response.json({ error: "Unable to load wallet" }, { status: 503 });
  }
}
