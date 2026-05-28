# Execution order (placeholder)

Each numbered file below is **high-level** today. Before execution:

1. Split each into concrete sub-phases (policy, bridge delta, UI
   parity, lint guards, merge) similar to
   [`media-player-architecture-refactor`](../../completed/media-player-architecture-refactor/).
2. Open a dedicated branch (e.g. `refactor/media-player-hls`) only after
   the prerequisite refactor is on `develop`.

| # | Phase | File |
| --- | --- | --- |
| 1 | Baseline re-verify + feed selection | [`01-baseline-verification-and-feed-selection.md`](./01-baseline-verification-and-feed-selection.md) |
| 2 | Library decision + prototype | [`02-library-decision-and-prototyping.md`](./02-library-decision-and-prototyping.md) |
| 3 | Bridge extension + cutover | [`03-bridge-extension-and-cutover.md`](./03-bridge-extension-and-cutover.md) |
| 4 | Verification + merge | [`04-verification-and-merge.md`](./04-verification-and-merge.md) |

Use [`COPY-PASTA.md`](./COPY-PASTA.md) for one-block-at-a-time execution
once the placeholders are expanded.
