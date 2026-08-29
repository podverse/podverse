# Execution order — mobile-track15-deep-links

Run COPY-PASTA prompts **1 → 4** in order.

## Phase 1 — sequential

1. **01** — Native universal/App Links config + scheme alignment (15.1, 15.2).
2. **02** — Path map + cold-start replay (15.3, 15.4) — the core routing logic.
3. **03** — Share URL parity across detail screens (15.5).
4. **04** — E2E deep-link screenshot (15.6) — final; archive set.

## Parallelism

01 (native) and 03 (share) are largely independent, but 02 depends on the scheme alignment from 01,
and 04 depends on 02. Keep sequential to avoid `navigation/index.tsx` + config conflicts.

## After each prompt

- Mark `[x]` in `COPY-PASTA.md`.
- Flip affected master steps (Tracks) + Appendix C + detail header to `done`.
- Do **not** run tests during agent work; operator verifies at the end.
