# COPY-PASTA run order

Executable mobile sets are prefixed `01`–`06` so they sort in run order in git.
Open the first numbered folder, paste its `COPY-PASTA.md`, then the next.

Each set still has its own internal prompt order — this file is **set vs set** only.

## Default (one chat, serial)

Wait for a set to finish before starting the next.

| #   | Set                                  | Why this slot                                                                           |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------- |
| —   | _None_                               | No active executable mobile COPY-PASTA sets right now. |

## Two chats (optional)

No active executable mobile COPY-PASTA sets right now.

## Do not run yet

| Set                                       | Reason                                              |
| ----------------------------------------- | --------------------------------------------------- |
| `media-player-livestream-hls-migration/`  | Blocked on the media-player architecture refactor.  |
| `web-e2e-coverage-high-level/`            | Planning expansion only, not implementation.        |
| `web-404-hardening-deferred/`             | No `COPY-PASTA.md`.                                 |

## Per-set internals (do not flatten)

Inside each file, keep that set's own sequence.
