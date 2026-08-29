# Execution order — mobile-pg8-car-android-auto

Run COPY-PASTA prompts **in sequence**. Do not start the next until the previous is finished
(service config before browse tree; browse tree before play; play before DHU proof + docs).

| Order | Plan file                            | Steps                  | Model    | Notes                                             |
| ----- | ------------------------------------ | ---------------------- | -------- | ------------------------------------------------- |
| 1     | `01-media-library-service-config.md` | 12.11, 12.13           | Opus 4.8 | Foreground service + Auto pkg validation + app-closed root |
| 2     | `02-browse-tree-from-cache.md`       | 12.12, 12.14           | Opus 4.8 | `onGetChildren` from library + downloads cache     |
| 3     | `03-car-play-url-resolution.md`      | 12.15                  | Opus 4.8 | Play MediaItem → shared engine; offline/remote URL |
| 4     | `04-dhu-checklist-docs-abcmemory.md` | 12.16, 12.17, 12.19, 12.20 | Auto / Codex 5.3 | Play Console checklist + DHU checklist + QA gate + abcmemory; archive set |

**Detail docs authored by this set:** 390 (12.11), 392 (12.13), 391 (12.12), 393 (12.14),
394 (12.15), 395 Android (12.16), 396 (12.17), 398 Android (12.19), 399 (12.20).

**Out of this set:** iOS CarPlay 12.7–12.10, CarPlay simulator checklist 12.18, parallel-worktree
note 12.21. These follow once the CarPlay entitlement is provisioned.
