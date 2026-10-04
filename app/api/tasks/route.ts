import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    const { data } = await auth.getSession();
    const user = data?.user;

    const tasks = user
      ? await sql`
          select
            t.id,
            t.title,
            t.description,
            t.task_type,
            t.user_reward_minor,
            t.currency,
            t.starts_at,
            t.expires_at
          from public.tasks t
          where t.status = 'active'
            and t.country_code = 'NG'
            and (t.starts_at is null or t.starts_at <= now())
            and (t.expires_at is null or t.expires_at > now())
            and not exists (
              select 1
              from public.task_completions c
              where c.task_id = t.id
                and c.user_id = ${user.id}
                and c.status in ('pending', 'approved')
            )
          order by t.created_at desc
        `
      : await sql`
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
