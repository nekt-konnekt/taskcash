import { auth } from "@/lib/auth/server";
import { sql } from "@/lib/db";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: Params) {
  const { data } = await auth.getSession();
  const session = data?.session;
  const user = data?.user;

  if (!session || !user) {
    return Response.json({ error: "Authentication required" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const [rows] = await sql.transaction([
      sql`
        with task as (
          select id, user_reward_minor, currency
          from public.tasks
          where id = ${id}
            and status = 'active'
            and country_code = 'NG'
            and (starts_at is null or starts_at <= now())
            and (expires_at is null or expires_at > now())
          limit 1
        ),
        inserted as (
          insert into public.task_completions (
            task_id,
            user_id,
            external_completion_id,
            status,
            advertiser_revenue_minor,
            user_reward_minor,
            currency,
            metadata,
            approved_at
          )
          select
            id,
            ${user.id},
            'taskcash-demo:' || id::text || ':' || ${user.id}::text,
            'approved',
            0,
            user_reward_minor,
            currency,
            '{"source":"taskcash_demo"}'::jsonb,
            now()
          from task
          on conflict (task_id, user_id, external_completion_id) do nothing
          returning id, task_id, user_id, status, user_reward_minor, currency
        ),
        wallet_init as (
          insert into public.wallets (user_id, currency)
          select user_id, currency from inserted
          on conflict (user_id) do nothing
          returning user_id
        ),
        ledger_insert as (
          insert into public.ledger_entries (
            user_id,
            completion_id,
            entry_type,
            direction,
            amount_minor,
            currency,
            reference,
            description
          )
          select
            user_id,
            id,
            'task_reward',
            'credit',
            user_reward_minor,
            currency,
            'task_reward:' || id::text,
            'Task reward'
          from inserted
          on conflict (reference) do nothing
          returning id
        ),
        wallet_update as (
          update public.wallets w
          set available_minor = w.available_minor + i.user_reward_minor,
              lifetime_earned_minor = w.lifetime_earned_minor + i.user_reward_minor,
              updated_at = now()
          from inserted i
          where w.user_id = i.user_id
          returning w.user_id
        )
        select id, status, user_reward_minor, currency
        from inserted
      `
    ]);

    const row = rows[0];

    if (!row) {
      const existing = await sql`
        select id, status, user_reward_minor, currency
        from public.task_completions
        where task_id = ${id}
          and user_id = ${user.id}
          and external_completion_id = 'taskcash-demo:' || ${id}::text || ':' || ${user.id}::text
        limit 1
      `;

      if (!existing[0]) {
        return Response.json({ error: "Task not found or unavailable" }, { status: 404 });
      }

      return Response.json({
        ok: true,
        idempotent: true,
        completionId: existing[0].id,
        status: existing[0].status,
        rewardMinor: existing[0].user_reward_minor,
        currency: existing[0].currency,
      });
    }

    return Response.json({
      ok: true,
      idempotent: false,
      completionId: row.id,
      status: row.status,
      rewardMinor: row.user_reward_minor,
      currency: row.currency,
    });
  } catch {
    return Response.json({ error: "Unable to complete task" }, { status: 503 });
  }
}
