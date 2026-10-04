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

    const userId = conversion.userExternalId;
    const providerSlug = "mock";

    await sql`
      insert into public.offer_networks (name, provider_key, status)
      values ('Mock Provider', ${providerSlug}, 'active')
      on conflict (provider_key) do update
        set updated_at = now()
    `;

    const tasks = await sql`
      select t.id, t.user_reward_minor, t.currency
      from public.tasks t
      join public.offer_networks n on n.id = t.network_id
      where n.provider_key = ${providerSlug}
        and t.external_task_id = ${conversion.externalOfferId}
      limit 1
    `;

    const task = tasks[0];

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    const completions = await sql`
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
      values (
        ${task.id},
        ${userId},
        ${conversion.externalConversionId},
        ${conversion.status === "approved" ? "approved" : "pending"},
        ${Math.round(conversion.advertiserValue * 100)},
        ${task.user_reward_minor},
        ${task.currency},
        ${JSON.stringify(conversion.rawPayload ?? {})}
      )
      on conflict (task_id, user_id, external_completion_id)
      do update set status = excluded.status
      returning id, status, user_id, user_reward_minor, currency
    `;

    const row = completions[0];

    if (!row) {
      return NextResponse.json({ error: "Unable to record conversion" }, { status: 503 });
    }

    await sql`
      insert into public.wallets (user_id, currency)
      values (${row.user_id}, ${row.currency})
      on conflict (user_id) do nothing
    `;

    if (row.status === "pending") {
      await sql`
        update public.wallets
        set pending_minor = pending_minor + ${row.user_reward_minor},
            updated_at = now()
        where user_id = ${row.user_id}
      `;
    } else if (row.status === "approved") {
      const reference = `task_reward:${row.id}`;

      await sql`
        insert into public.ledger_entries (
          user_id, completion_id, entry_type, direction,
          amount_minor, currency, reference, description
        )
        values (
          ${row.user_id}, ${row.id}, 'task_reward', 'credit',
          ${row.user_reward_minor}, ${row.currency}, ${reference}, 'Task reward'
        )
        on conflict (reference) do nothing
      `;

      await sql`
        update public.wallets
        set available_minor = available_minor + ${row.user_reward_minor},
            lifetime_earned_minor = lifetime_earned_minor + ${row.user_reward_minor},
            updated_at = now()
        where user_id = ${row.user_id}
      `;
    }

    return NextResponse.json({
      ok: true,
      status: row.status,
      completionId: row.id,
    });
  } catch {
    return NextResponse.json({ error: "Invalid webhook" }, { status: 400 });
  }
}
