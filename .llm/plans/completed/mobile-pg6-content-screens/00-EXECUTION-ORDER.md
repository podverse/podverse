# PG-6 content screens — execution order

Prompts are mostly sequential; Track 8 (Home) before Track 9 (details rely on Home rows/nav). Within
Track 9, screens are independent and may be reordered. Mark master-plan steps `done` after each
prompt.

| Order | Plan file | Steps | Detail IDs | Model |
| ----- | --------- | ----- | ---------- | ----- |
| 1 | `01-home-shell-and-selector.md` | 8.1–8.3 | 240–242 | Codex 5.3 |
| 2 | `02-home-feeds.md` | 8.4–8.9 | 243–248 | Codex 5.3 |
| 3 | `03-home-states-nav-play.md` | 8.10–8.13 | 249–252 | Codex 5.3 |
| 4 | `04-home-e2e.md` | 8.14–8.15 | 253–254 | Auto |
| 5 | `05-podcast-episode-detail.md` | 9.1–9.4 | 260–263 | Codex 5.3 |
| 6 | `06-music-clip-detail.md` | 9.5–9.7 | 264–266 | Codex 5.3 |
| 7 | `07-search.md` | 9.8–9.9 | 267–268 | Codex 5.3 |
| 8 | `08-library-screens.md` | 9.10–9.16 | 269–275 | Codex 5.3 |
| 9 | `09-more-rss-opml.md` | 9.17–9.23 | 276–282 | Opus 4.8 (9.21) / Codex / Auto |
| 10 | `10-categories-and-e2e.md` | 9.24–9.28 | 283–287 | Codex 5.3 / Auto |

Shared components (list rows, state components in `01`/`02`/`03`) are reused by Track 9 screens —
build Track 8 first. Archive to `.llm/plans/completed/mobile-pg6-content-screens/` when all steps
`done`.
