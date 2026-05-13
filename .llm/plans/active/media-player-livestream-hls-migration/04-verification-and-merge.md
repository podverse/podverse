# Phase 4 — Verification and merge (placeholder)

## Expand later

- Full smoke matrix: live audio, live video, live ↔ non-live both
  directions, Safari native HLS (no spurious `hls.js` fetch where
  applicable), bundle analyzer on `hls` chunk.
- Add `no-restricted-imports` for `video.js` (reintroduction guard).
- Update `.cursor/skills/media-player-architecture/SKILL.md` (or add a
  sibling skill) for the HLS-inclusive architecture.
- PR, merge, then move **this** plan-set to `.llm/plans/completed/`.

## Exit (when expanded)

Green CI; skill/docs updated; plan-set archived.

## Verification (placeholder)

```bash
npm run lint -w apps/web
npm run test:unit -w apps/web
make e2e_test_web_report
```
