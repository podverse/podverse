# Execution order — mobile-unified-subscriptions

Run sequentially. Step 1 is the foundation both other steps (and the car set) depend on. Paste one
COPY-PASTA prompt at a time.

| Order | Plan file                              | Master step | Model     | Depends on |
| ----- | -------------------------------------- | ----------- | --------- | ---------- |
| 1     | `01-subscriptions-repository.md`       | 9b.8        | Opus 4.8  | —          |
| 2     | `02-home-subscribed-mixed-filter.md`   | 8.16        | Codex 5.3 | Step 1     |
| 3     | `03-library-subscriptions-list.md`     | 9.30        | Codex 5.3 | Step 1     |

Notes:

- **Step 1 first** — it is the shared repository. Steps 2 and 3 both consume it and are otherwise
  independent (either order after step 1). The car set (`mobile-pg8-car-library-follows`, 12.22)
  also depends on step 1.
- After **each** prompt: flip that master-plan step to `done` (Tracks + Appendix C), set the
  matching `details/NNN` header to `done`, and tick the prompt in `COPY-PASTA.md`.
- When a track's steps in this set are all done, re-append ` (DONE)` to its `## Track …` heading
  (Track 9b for step 1, Track 8 for step 2, Track 9 for step 3) — only if no other step in that
  track is still open.
- After **all three** are `done`: archive this set to
  `.llm/plans/completed/phase-1/mobile-unified-subscriptions/` (plan-completion skill).
- Agent policy: implement locally; do **not** run test/lint/E2E suites; end each response with the
  operator's verification steps. Git/`gh` are operator-only.
