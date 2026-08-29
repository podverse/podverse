# 07 — Channel seen state

**Cursor model:** Opus 5
**Reasoning:** extra high
**Detail:** [703-channel-seen-state](/docs/proposals/mobile/_master-plan_/phase-2/details/703-channel-seen-state.md)
**Master step:** P2.4.4
**Depends on:** 06

Read [00-SUMMARY.md](00-SUMMARY.md) decisions 19–23 and 39–40 before starting. This prompt crosses
`apps/mobile`, `apps/api`, and `packages/orm` — treat the API contract as the risky part.

## Goal

Per-channel **seen** state, stored as one timestamp per channel rather than per-item flags, so
subscribed lists can show unseen counts without unbounded storage.

## Vocabulary

Content is **seen / unseen**. Notifications are **read / unread**. Never mix the verbs. Notifications
still use seen/unseen in code until prompt 17 renames them — do not let that leak into this work.

## Cross-surface note

This state is account-synced, so **web is a client of it too**. Prompt 13 makes web read and write
it. Design the endpoints for both callers now rather than retrofitting: nothing here may assume a
mobile-only caller.

## Work

1. **Model:** one `last_seen_at` timestamp per channel per user. The unseen count for a channel is
   the number of stored items with `pub_date > last_seen_at`. Marking seen sets it to now.
2. **Follow the existing precedent.** `Account.notifications_last_seen_at` is the same pattern one
   level up, and `apps/api/src/lib/accountNotificationApiSerialization.ts` already derives
   `is_new` / `countUnseen` by comparing a timestamp. Reuse that shape; do not invent a new one.
3. **Server:** add an account-scoped table in `packages/orm` with a linear migration under
   `infra/k8s/base/ops/source/database/linear-migrations/` per **linear-db-migrations**. Follow the
   ORM varchar-length guidance in `AGENTS.md`.
4. **API:** add endpoint(s) returning per-channel unseen counts for the caller, plus a mark-seen
   write.
   - Cap each channel's count at **20**; clients render `20+`.
   - **Bound the result set.** Paginate or apply an explicit ceiling so a user with a very large
     subscription list can never trigger an unbounded query. An uncapped path fails review.
   - One bounded request must serve a whole list — no per-channel request fan-out.
   - Add Joi schemas under `apps/api/src/schemas/` and keep OpenAPI in sync per **swagger-openapi**.
5. **Mobile:** store timestamps locally so anonymous users get working counts, expose them through a
   repository, and sync for signed-in users at **account** tier.
6. **Marking:** opening a channel marks that channel seen. Channel-level only — no per-episode
   mark-as-seen.
7. **Conflict resolution:** the later timestamp wins; never move one backward. Anonymous timestamps
   merge into the account on sign-in by the same rule, idempotently.
8. **Independence:** assert in tests that no unseen count reads notification rows.
9. **i18n:** any new user-facing strings go in the **`consumer`** catalog, not the mobile overlay,
   because web reuses them in prompt 13.
10. Integration tests for the endpoint including the cap and the bound; unit tests for count
    derivation, merge-by-later, and monotonicity.

## Constraints

- Strict equality, no type assertions, `import type` on separate lines.
- Do not reproduce the legacy per-episode model (`NEW_EPISODES_COUNT_DATA_2`).
- Do not run tests during implementation.

## Done when

Timestamps exist locally and server-side, counts derive from item publish dates, the endpoint is
capped and bounded and serves both clients, marking works signed out, and sync only moves seen state
forward.
