# Media player Space shortcut — execution order

## Phase 1 (required)

1. Execute [`01-space-toggle-set-mp-is-playing.md`](01-space-toggle-set-mp-is-playing.md).
2. Verify Space toggles play/pause for loaded non-live audio when main wrapper is focused
   (programmatic focus in E2E is acceptable for this phase).

## Phase 2 (required for “click empty space” UX)

1. Execute [`02-main-wrapper-focus-on-mousedown.md`](02-main-wrapper-focus-on-mousedown.md).
2. Verify Space toggles play after clicking empty `#mainOuterWrapper` on `/podcasts` (or
   equivalent E2E).
3. Verify Space on a focused sidebar link still does **not** toggle play (link intercept
   preserved).

## Phase 3 (optional polish)

1. Execute [`03-keyboard-guard-hardening.md`](03-keyboard-guard-hardening.md).
2. Verify slider/dialog guards and volume arrow behavior.

## Notes

- Phases are sequential; do not start plan 02 until plan 01 is verified.
- Plan 01 alone fixes livestream toggle path but not focus retention.
- Plan 02 fixes the user-reported `/podcasts` repro (click empty area, press Space).
- After all executed plans, run cumulative verification in
  [`COPY-PASTA.md`](COPY-PASTA.md).
