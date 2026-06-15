# 04 — Expand demo showcase to all 8 list types (seed real content)

Add demo slots and seed data for the new list demos. Critically, seeding must actually produce the content each list renders: the episode-chapters list needs its episode's chapters parsed into the DB, and the podcast-clips list needs several public clips on the channel (the current seeder creates only one).

## Slots and ordering

- New showcase ids in helpers + catalog: `podcast-clips-audio`, `podcast-clips-video`, `episode-chapters-audio`, `episode-chapters-video` (clips map to the podcast channel with `?type=clips`; chapters map to the episode via the new `episode-chapters` route).
- List section display order: podcast-audio, podcast-video, album-audio, album-video, episode-chapters-audio, episode-chapters-video, podcast-clips-audio, podcast-clips-video.
- Add i18n labels in `apps/web/i18n/originals/en-US.json` and label keys in `apps/web/src/lib/embed/embedDemoShowcaseCatalog.ts`.

## Seed-def model

Extend `packages/helpers/src/lib/constants/embedDemoPiSeedFeeds.ts`: add fields for the new list slots (e.g. `clipsListShowcaseId`, `chaptersListShowcaseId`) on the relevant audio/video PI feeds so a podcast feed seeds both episodes-list and clips-list, and a chapter-bearing feed seeds the chapters-list.

## Chapters content (episode-chapters list)

The seeder already parses chapters via `parseChapters(item)` in `apps/workers/src/commands/embedDemo/seedShowcaseClipChapterHelpers.ts` (used today to resolve the single `chapter-*` showcase). Reuse `resolveItemWithChaptersFeed` + `parseChapters` to pick a chapter-bearing item, ensure its chapters are parsed and persisted, then upsert the `episode-chapters-audio/video` showcase rows to that item's `id_text`. The new route reads chapters live via `reqItemParseAndGetChapters`, so persisted chapters guarantee non-empty rows.

## Clips content (podcast-clips list)

`ensureSampleClip` currently creates exactly one clip. Add a `seedSampleClipsForChannel` helper that creates several public clips (owned by the embed demo system account, `sharable_status_id = SharableStatusEnum.Public`) across the channel's recent items, so the clips list shows multiple rows. Upsert `podcast-clips-audio/video` showcase rows to the channel `id_text` (route `/embed/podcast/{channel}?type=clips`). Make it idempotent (find-or-create by title/item like `ensureSampleClip`).

## Wiring and parity

- Wire the new seed-def fields through `apps/workers/src/commands/embedDemo/seedShowcaseFeeds.ts` -> `seedEmbedDemoClipAndChapterShowcases` (extend it to also seed the list slots).
- Mirror the new content (multiple clips + chapters parse) and showcase rows in the E2E/local fixtures: `tools/web/seed-embed-fixtures.mjs` and `infra/development/seeds/local-dev-accounts.sql` parity.
- Update `buildEmbedDemoHref` (helpers) so it emits the correct `type=clips`/`presentation`/route for each new slot.
- The existing `clips-audio`/`chapter-audio` single slots stay as-is; the new slots are list-mode and use channel/episode resources, not the single clip/chapter ids.

## Verification

```bash
npm run build -w apps/workers
# (operator) re-run embed demo seed + local DB init, then:
make e2e_test_web_report_spec SPEC=e2e/embed.spec.ts
```
