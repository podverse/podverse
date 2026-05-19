# Phase 1 — Baseline verification and feed selection (placeholder)

## Prerequisite

[`media-player-architecture-refactor`](../../completed/media-player-architecture-refactor/)
merged to `develop`.

## Expand later

- Re-run the four livestream E2E specs from architecture Phase 1
  section 6b against **post-refactor** `develop` to confirm the
  baseline still matches expectations.
- Confirm the decision matrix "Live streams" appendix in
  `MEDIA-PLAYER-DECISION-MATRIX.md` is still accurate.
- Lock **one** stable live-audio HLS URL and **one** stable live-video
  HLS URL for CI; document in the matrix with last-verified date.

## Exit (when expanded)

Baseline green; feeds chosen; matrix appendix updated.

## Verification (placeholder)

```bash
npm run test:unit
make e2e_test_web_report_spec SPEC=e2e/media-player-livestream-audio-start.spec.ts
```

(Adjust spec paths to match whatever Phase 1 actually added.)
