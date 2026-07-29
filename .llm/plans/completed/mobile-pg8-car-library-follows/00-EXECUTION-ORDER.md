# Execution order — mobile-pg8-car-library-follows

Run sequentially. Step 1 is the real feature; step 2 is a small operator doc that completes the
track. Paste one COPY-PASTA prompt at a time.

| Order | Plan file                                     | Master step | Model     | Depends on          |
| ----- | --------------------------------------------- | ----------- | --------- | ------------------- |
| 1     | `01-project-directory-follows-and-playlists.md` | 12.22       | Opus 4.8  | 9b.8 / 600 (repo)   |
| 2     | `02-car-parallel-worktree-operator-doc.md`    | 12.21       | Auto      | —                   |

Notes:

- **Step 1 depends on 9b.8 / 600** — the `subscriptionsRepository` from the
  `mobile-unified-subscriptions` set. Land that repo first; step 1 maps it to car nodes. Step 2
  (operator doc) has no dependency and may run any time.
- After **each** prompt: flip that master-plan step to `done` (Tracks + Appendix C), set the
  matching `details/NNN` header to `done`, and tick the prompt in `COPY-PASTA.md`.
- After **both** are `done`: append ` (DONE)` to the `## Track 12 …` heading and archive this set
  to `.llm/plans/completed/mobile-pg8-car-library-follows/` (plan-completion skill).
- Agent policy: implement locally; do **not** run test/lint/E2E suites; end each response with the
  operator's device verification steps. Git/`gh` are operator-only.
