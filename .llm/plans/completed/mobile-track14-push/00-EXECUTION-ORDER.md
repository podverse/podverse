# Execution order — mobile-track14-push

Run COPY-PASTA prompts **1 → 4** in order. **Track 15 (452, 453) must be `done` before Step 3.**

## Phase 1 — sequential

1. **01** — FCM playstore integration + device register + locale wrapper + permission UX
   (14.1, 14.2, 14.3, 14.5). Foundation: push boundary, `installation_id`, register hook.
2. **02** — UnifiedPush FOSS transport + missing UP wrappers (14.6). Opus.
3. **03** — Notification tap routing (14.4). **Requires Track 15 (452, 453).**
4. **04** — FOSS non-FOSS register doc + E2E push-routing stub (14.7, 14.8) — final; archive set.

## Parallelism

None. 02 extends the boundary from 01; 03 reuses Track 15 routing + the push open-event source from
01; 04 depends on 03. Shared files (`helpers-requests` wrappers, `_request.ts`, push module, auth
hooks) make parallel runs conflict-prone.

## After each prompt

- Mark `[x]` in `COPY-PASTA.md`.
- Flip affected master steps (Tracks) + Appendix C + detail header to `done`.
- Do **not** run tests during agent work; operator verifies at the end.
