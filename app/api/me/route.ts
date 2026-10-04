import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

export async function GET() {
  const { session, user } = await auth.getSession();

  if (!session || !user) {
    return Response.json({ authenticated: false }, { status: 401 });
  }

  try {
    await sql`
      insert into public.profiles (id, display_name)
      values (${user.id}, ${user.name ?? null})
      on conflict (id) do update
        set display_name = coalesce(excluded.display_name, public.profiles.display_name),
            updated_at = now()
    `;

    await sql`
      insert into public.wallets (user_id)
      values (${user.id})
      on conflict (user_id) do nothing
    `;

    await sql`
      insert into public.user_trust_scores (user_id)
      values (${user.id})
      on conflict (user_id) do nothing
    `;

    return Response.json({
      authenticated: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  } catch {
    return Response.json({ error: "Unable to initialize account" }, { status: 503 });
  }
}
