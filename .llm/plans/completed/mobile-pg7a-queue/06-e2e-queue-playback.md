# 06 — E2E play mini-player, queue-add, auto-queue advance

Implement master steps **10.23–10.25** (final PG-7a prompt).

## Detail docs

- [332-e2e-play-mini-player](/docs/proposals/mobile/_master-plan_/details/332-e2e-play-mini-player.md)
- [333-e2e-queue-add](/docs/proposals/mobile/_master-plan_/details/333-e2e-queue-add.md)
- [334-e2e-auto-queue-advance](/docs/proposals/mobile/_master-plan_/details/334-e2e-auto-queue-advance.md)

## Tasks

1. Add/extend Maestro flows under `apps/mobile/e2e/` for play → mini-player visible (test-assets
   `:2111`, Android host rewrite). Use placeholder mini `testID` if PG-7b UI not yet landed;
   document follow-up.
2. Queue-add flow → Library queue row screenshot.
3. Auto-queue advance after ended (short fixture); state assert and/or screenshot; respect
   **mobile-maestro-timeouts**.
4. Mark **10.23–10.25** / **332–334** `done`.
5. Archive this plan set to `.llm/plans/completed/mobile-pg7a-queue/` and update
   `LLM-PLANS-ACTIVE.md`. End with cumulative operator verification commands for the whole PG-7a
   set.

## Acceptance

- Flows use named E2E devices only
- Screenshots land in slot reports
- `flow_needs_test_assets` where enclosures play

Do not run tests during agent work — instruct the operator (Mobile Maestro tab).
