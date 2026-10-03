import { sql } from "@/lib/db";

export async function GET() {
  try {
    const tasks = await sql`
      select
        id,
        title,
        description,
        task_type,
        user_reward_minor,
        currency,
        starts_at,
        expires_at
      from public.tasks
      where status = 'active'
        and country_code = 'NG'
        and (starts_at is null or starts_at <= now())
        and (expires_at is null or expires_at > now())
      order by created_at desc
    `;

    return Response.json({ tasks });
  } catch {
    return Response.json(
      { error: "Unable to load tasks" },
      { status: 503 },
    );
  }
}
