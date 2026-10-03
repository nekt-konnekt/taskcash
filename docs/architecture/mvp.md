# TaskCash MVP Architecture

## Core loop

1. User views eligible tasks.
2. User starts a task through a provider adapter.
3. Provider records completion and sends a signed server callback.
4. TaskCash validates the callback and creates a pending reward.
5. Provider approval moves the reward to available balance.
6. User either withdraws available NGN or spends an approved unlock credit.

## Non-negotiables

- The browser never writes cash balances.
- Every provider conversion is idempotent.
- Pending, available, paid, and reversed states are distinct.
- Reward terms are snapshotted when a user starts a task.
- Provider settlement is reconciled against our ledger.
- Fraud signals can hold rewards without mutating historical transactions.

## Provider abstraction

Each provider implements: inventory sync, offer normalization, launch URL generation, callback verification, conversion normalization, and settlement/reversal handling.

The UI consumes normalized offers and never depends on provider-specific fields.

## MVP providers

Start with one approved provider. Add a second only after the first produces reliable Nigerian inventory and at least one successful settlement cycle.
