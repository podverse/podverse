# Phase 02 — Asset pipeline, transcode, and layout

## Script

Add `tools/test-assets/src/import-embed-pd-assets.ts`:

- Reads manifest from `tools/test-assets/embed-pd-sources.json`
- Downloads masters to `.cache/embed-pd/` (gitignored)
- Trims with ffmpeg `-ss` / `-t`
- Emits locale tree under `apps/web/public/embed-demo/{locale}/`
- Extracts PNG frames for artwork at 0s, 20s, 40s

## npm script

```bash
npm run import:embed-pd -w podverse-test-assets
```

## Directory layout

```
apps/web/public/embed-demo/
  ATTRIBUTION.md
  en-US/{audio,videos,images}/
  es/{audio,videos,images}/
  fr/{audio,videos,images}/
  el-GR/{audio,videos,images}/
```

## Path helpers

Update [`tools/web/embed-demo-public-paths.mjs`](../../../tools/web/embed-demo-public-paths.mjs) to accept locale:

- `/embed-demo/{locale}/audio/...`

Default locale `en-US` for backward-compatible constant exports.
