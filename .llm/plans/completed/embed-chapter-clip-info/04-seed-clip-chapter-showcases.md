# 04 — Seed clip + chapter showcases

## Goal

PI seed creates "Sample Clip" (90s) and middle chapter on podcast-audio/video channels; upsert clip-audio, clip-video, chapter-audio, chapter-video showcase rows.

## Tasks

1. Add `clip-video`, `chapter-video` to `embedDemoShowcase.ts` + tests + web demo catalog/i18n.
2. Extend `EmbedDemoPiSeedFeedDef` for clip/chapter seed flags on podcast feeds.
3. Implement seed helpers in `seedShowcaseFeeds.ts`: demo account, idempotent Sample Clip, parseChapters with middle pick, upsert showcases.
4. Update `embedDemoPiSeedFeeds.test.ts`, worker helper tests, `EMBED-PLAYER.md`.

## Verification

```bash
make local_db_init
make local_seed_embed_demo_feeds
npm run test -w @podverse/helpers -- src/lib/constants/embedDemoShowcase.test.ts src/lib/constants/embedDemoPiSeedFeeds.test.ts
npm run test -w apps/workers -- src/commands/embedDemo/seedShowcaseFeedHelpers.test.ts
```
