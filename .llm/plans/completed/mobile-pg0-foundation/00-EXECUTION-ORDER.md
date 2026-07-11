# PG-0 execution order

Run numbered plans **sequentially**. Do not skip ahead.

| Order | Plan | Steps | Primary model |
| ----- | ---- | ----- | ------------- |
| 1 | `01-cursorignore-and-ci-scoping.md` | 0.1, 0.4, 0.5, 0.19 | Auto |
| 2 | `02-tier-d-and-eslint.md` | 0.2, 0.3 | Codex 5.3 |
| 3 | `03-mobile-app-docs.md` | 0.6, 0.7, 0.17, 0.18 | Codex 5.3 |
| 4 | `04-cursor-rules-skills-standard.md` | 0.8, 0.11, 0.12, 0.15, 0.16 | Codex 5.3 |
| 5 | `05-native-playback-car.md` | 0.9, 0.10 | Opus 4.8 |
| 6 | `06-root-entrypoints.md` | 0.13, 0.14 | Auto |

## Notes

- Plan 03 creates `apps/mobile/` if missing (docs only — no `package.json` yet unless needed for lint paths).
- After each COPY-PASTA prompt: mark affected steps **`done`** in master plan Tracks + Appendix C and detail doc headers.
- Archive this plan set to `.llm/plans/completed/mobile-pg0-foundation/` when all six prompts are done.
