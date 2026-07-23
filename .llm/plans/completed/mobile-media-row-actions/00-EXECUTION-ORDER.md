# PG-6.6 media row actions — execution order

Run **01 → 03** sequentially. May parallel a PG-7 session/worktree. Mark steps `done` after each
prompt; update Appendix C + detail headers. Archive to
`.llm/plans/completed/mobile-media-row-actions/` on the final prompt.

| Order | Plan file | Steps | Detail IDs | Model |
| ----- | --------- | ----- | ---------- | ----- |
| 1 | `01-inventory.md` | 9c.1 | 497 | Auto |
| 2 | `02-shared-component.md` | 9c.2 | 498 | Codex 5.3 |
| 3 | `03-migrate-screens.md` | 9c.3 | 499 | Codex 5.3 |

```mermaid
flowchart TB
  P1["01 inventory"] --> P2["02 MediaRowActions"]
  P2 --> P3["03 migrate screens"]
  pg7["PG-7 queue/play hooks"] -.-> P3
```
