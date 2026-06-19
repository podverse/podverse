# Floating video player — execution order

## Phase 1 (sequential)

1. Execute [`01-floating-video-default-appearance.md`](01-floating-video-default-appearance.md).
2. Verify flush positioning and square corners on both non-live and livestream floating
   players before continuing.

## Phase 2 (sequential)

1. Execute [`02-floating-video-draggable.md`](02-floating-video-draggable.md).
2. Verify drag works and reload resets position before continuing.

## Phase 3 (sequential)

1. Execute [`03-floating-video-resizable.md`](03-floating-video-resizable.md).
2. Verify corner resize on desktop, no resize on touch, reload resets size before
   continuing.

## Phase 4 (sequential)

1. Execute [`04-modal-video-center.md`](04-modal-video-center.md).
2. Verify modal shows video (not artwork) for non-live video playback.

## Notes

- Phases are sequential; do not start the next plan until the previous one is verified to
  your liking.
- Plan 04 is independent of drag/resize behavior but should be executed last so floating
  player polish is settled first.
- After all four plans, run the cumulative verification block in
  [`COPY-PASTA.md`](COPY-PASTA.md).
