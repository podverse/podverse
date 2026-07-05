# PG-1 execution order

Run COPY-PASTA prompts in sequence. Do not skip ahead.

| Order | Plan file | Steps | Model |
| ----- | --------- | ----- | ----- |
| 1 | `01-scaffold-and-build-order.md` | 1.1, 1.9, 1.12, 1.13, 1.14 | Codex 5.3 |
| 2 | `02-move-policy-modules.md` | 1.2, 1.3, 1.4, 1.5, 1.6 | Opus 4.8 |
| 3 | `03-move-tests-and-exports.md` | 1.7, 1.8 | Opus 4.8 |
| 4 | `04-web-migration-and-verify.md` | 1.10, 1.11 | Opus 4.8 |

After prompt 4: archive to `.llm/plans/completed/mobile-pg1-playback-core/`.
