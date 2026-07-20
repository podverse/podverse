# 02 — Radii.full → round + Metro crypto shim docs (final)

Hygiene pass + document the Metro Node `crypto` shim. **Final step** of this plan set — archive
when finished.

## Tasks

1. Replace all `tokens.radii.full` with `tokens.radii.round` under `apps/mobile/` (design tokens
   only define `round`; `Button` already uses it).
2. Add a short troubleshooting bullet in `apps/mobile/APPS-MOBILE.md` for Metro resolving Node
   `crypto` / `node:crypto` to `apps/mobile/src/shims/node-crypto.js` (md5/sha256 for helpers hash
   pulled via parser-mapping → v4v-metaboost). Point at `apps/mobile/metro.config.js`
   `resolveRequest`.
3. On this final step: mark COPY-PASTA complete, archive
   `.llm/plans/active/mobile-addbyrss-mapped-playback/` →
   `.llm/plans/completed/mobile-addbyrss-mapped-playback/`, and end with **cumulative** operator
   verification for the whole set (at least `add-by-rss` Maestro; include home/search if radii
   changes touch those screens’ chip styles).

## Acceptance

- No `radii.full` remaining under `apps/mobile/`
- APPS-MOBILE documents the crypto shim
- Plan set archived to `completed/`

Do not run tests during agent work.
