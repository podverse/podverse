# COPY-PASTA run order

Executable mobile sets are numbered so they sort in run order in git.
Open the first numbered folder, paste its `COPY-PASTA.md`, then the next.

Each set still has its own internal prompt order — this file is **set vs set** only.

## Default (one chat, serial)

No numbered mobile set is active.

Completed: `.llm/plans/completed/09-post-sweep-regression-repair/` (followed
`.llm/plans/completed/08-overnight-test-fix-sweep/`; that sweep's defer log is
[DEFERRED-PROBLEMS.md](../completed/08-overnight-test-fix-sweep/DEFERRED-PROBLEMS.md), empty). The
previous mobile set is `.llm/plans/completed/07-mobile-auto-offline-detection/`.

## Do not run yet

| Set                                       | Reason                                              |
| ----------------------------------------- | --------------------------------------------------- |
| `media-player-livestream-hls-migration/`  | Blocked on the media-player architecture refactor.  |
| `web-e2e-coverage-high-level/`            | Planning expansion only, not implementation.        |
| `web-404-hardening-deferred/`             | No `COPY-PASTA.md`.                                 |

## Per-set internals (do not flatten)

Inside each file, keep that set's own sequence.
