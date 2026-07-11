# PG-9 i18n — execution order

| Order | Plan file | Steps | Model |
| ----- | --------- | ----- | ----- |
| 1 | `01-i18n-runtime-v1.md` | 17.1–17.5, 17.2 | Codex 5.3 / Auto |
| 2 | `02-i18n-runtime-compiled-fix.md` | 17.0 | Codex 5.3 |
| 3 | `03-i18n-catalog-migration.md` | 17.6, 17.9–17.13, 17.7 | Codex 5.3 / Auto |
| 4 | `04-i18n-locale-e2e.md` | 17.8 | Codex 5.3 |

Steps 2–3 may be split across releases; v1 mobile strings can ship after prompt 1 only.
