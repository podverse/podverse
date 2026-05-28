# Livestream / HLS migration — copy-pasta

**Do not execute** until
[`media-player-architecture-refactor`](../../completed/media-player-architecture-refactor/)
is merged **and** each phase file below has been expanded from
placeholder to implementation-ready detail.

- [ ] **Expand placeholders**

  Flesh out
  [`01-baseline-verification-and-feed-selection.md`](./01-baseline-verification-and-feed-selection.md)
  through
  [`04-verification-and-merge.md`](./04-verification-and-merge.md)
  with the same depth as the architecture refactor sub-phases. Update
  this `COPY-PASTA.md` with per-sub-phase blocks when done.

- [ ] **Phase 1 — baseline verification and feed selection**

  Execute [`01-baseline-verification-and-feed-selection.md`](./01-baseline-verification-and-feed-selection.md)
  when expanded.

- [ ] **Phase 2 — library decision and prototyping**

  Execute [`02-library-decision-and-prototyping.md`](./02-library-decision-and-prototyping.md)
  when expanded.

- [ ] **Phase 3 — bridge extension and cutover**

  Execute [`03-bridge-extension-and-cutover.md`](./03-bridge-extension-and-cutover.md)
  when expanded.

- [ ] **Phase 4 — verification and merge**

  Execute [`04-verification-and-merge.md`](./04-verification-and-merge.md)
  when expanded.

- [ ] **Plan archival (this plan-set)**

  After merge:

  ```bash
  mv .llm/plans/active/media-player-livestream-hls-migration \
     .llm/plans/completed/media-player-livestream-hls-migration
  ```
