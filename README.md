# TaskCash

Nigerian-first rewards platform for verified tasks, advertiser-funded offers, cash withdrawals, and content unlocks.

## MVP loop

User → eligible task → verified conversion → reward ledger → cash withdrawal or content unlock.

## Current status

Foundation created. Provider inventory is intentionally not mocked as live. The next milestone is provider approval and the task/reward data model.

## Architecture

- Next.js PWA frontend
- Supabase Auth/Postgres/RLS
- Provider adapter layer for offerwalls
- Server-side conversion/postback processing
- Immutable reward ledger
- Withdrawal queue and reconciliation
- Fraud/risk signals
- Content and feature unlocks
