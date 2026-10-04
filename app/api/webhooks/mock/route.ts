import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { mockProvider } from "@/lib/task-engine/providers/mock";

export async function POST(request: Request) {
  try {
    const conversion = await mockProvider.verifyConversion(request);

    if (
      !conversion.externalConversionId ||
      !conversion.externalOfferId ||
      !conversion.userExternalId
    ) {
      return NextResponse.json({ error: "Invalid conversion payload" }, { status: 400 });
    }

    const status = conversion.status === "approved" ? "approved" : "pending";
    const advertiserRevenueMinor = Math.round(conversion.advertiserValue * 100);

    const [rows] = await sql.transaction([
      sql`
        with inserted as (
          insert into public.task_completions (
            task_id,
            user_id,
            external_completion_id,
            status,
            advertiser_revenue_minor,
            user_reward_minor,
            currency,
            metadata
          )
          select
            t.id,
            ${conversion.userExternalId},
            ${conversion.externalConversionId},
            ${status},
            ${advertiserRevenueMinor},
            t.user_reward_minor,
            t.currency,
            ${JSON.stringify(conversion.rawPayload ?? {})}
          from public.tasks t
          join public.offer_networks n on n.id = t.network_id
          where n.provider_key = 'mock'
            and t.external_task_id = ${conversion.externalOfferId}
          limit 1
          on conflict (task_id, user_id, external_completion_id) do nothing
          returning id, status, user_id, user_reward_minor, currency
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
          where status = 'approved'
          on conflict (reference) do nothing
          returning id
        ),
        wallet_update as (
          update public.wallets w
          set pending_minor = w.pending_minor +
                case when i.status = 'pending' then i.user_reward_minor else 0 end,
              available_minor = w.available_minor +
                case when i.status = 'approved' then i.user_reward_minor else 0 end,
              lifetime_earned_minor = w.lifetime_earned_minor +
                case when i.status = 'approved' then i.user_reward_minor else 0 end,
              updated_at = now()
          from inserted i
          where w.user_id = i.user_id
          returning w.user_id
        )
        select id, status, user_id, user_reward_minor, currency
        from inserted
      `,
    ]);

    const row = rows[0];

    if (!row) {
      const existing = await sql`
        select id, status, user_id, user_reward_minor, currency
        from public.task_completions
        where user_id = ${conversion.userExternalId}
          and external_completion_id = ${conversion.externalConversionId}
        order by completed_at desc
        limit 1
      `;

      if (!existing[0]) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }

      return NextResponse.json({
        ok: true,
        idempotent: true,
        status: existing[0].status,
        completionId: existing[0].id,
      });
    }

    return NextResponse.json({
      ok: true,
      idempotent: false,
      status: row.status,
      completionId: row.id,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
