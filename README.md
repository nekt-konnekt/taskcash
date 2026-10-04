# TaskCash

Nigerian-first rewards platform for verified tasks, advertiser-funded offers, cash withdrawals, and content unlocks.

## MVP loop

User → eligible task → verified conversion → reward ledger → cash withdrawal or content unlock.

## Current status

Foundation deployed. Production is connected to Neon. Provider inventory is intentionally not mocked as live. The next milestone is reconciling the production schema, then implementing the task-to-reward transaction engine.

## Architecture

- Next.js PWA frontend
- Neon PostgreSQL + Neon Auth
- Provider adapter layer for offerwalls
- Server-side conversion/postback processing
- Immutable reward ledger with server-authoritative financial mutations
- Withdrawal queue and payout reconciliation
- Fraud/risk signals
- Content and feature unlocks


## Database architecture

Neon is the system of record for TaskCash application data. Neon Auth owns authentication and sessions; the TaskCash `profiles` table owns application-level user state.

Financial mutations are server-authoritative. The client cannot directly award rewards, approve conversions, modify balances, or approve withdrawals.

The canonical earning flow is:

User → offer → user task → provider conversion → reward ledger → available balance → withdrawal.

The canonical schema is maintained under `db/migrations/`.