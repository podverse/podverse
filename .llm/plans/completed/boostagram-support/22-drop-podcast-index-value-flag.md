**Cursor model:** Cursor Grok 4.7 · **Reasoning:** extra high

# Drop the Podcast Index value flag

Value recipients already come from the RSS parse into `channel_values` and `item_values`. `has_podcast_index_value` is a boolean on `channel` that the parser never writes. The worker `podcastIndexValueUpdateAll` calls Podcast Index `podcasts/bytag?podcast-valueTimeSplit=true`, collects feed ids, and `console.warn`s them. It does not save recipients. Remove the column, the DTO field, every read and write of that field, that worker, and the Podcast Index value-id client methods.

Leave `has_value_time_splits`. The parser still sets that from time-split rows (`packages/parser/src/lib/rss/item/itemValue.ts`). Leave `episodeGetByGuid`. That call loads an episode. It is not a value-id call.

The web player and the phone player, when a stored channel has no `channel_values` array, load our channel. They do not read this flag. That load is R44 and R46. This plan does not add it and does not edit plans 40 or 41.

## Rows

R42

## Runs after

none

## Files

- infra/k8s/base/ops/source/database/linear-migrations/app/0019_drop_channel_has_podcast_index_value.sql
- infra/k8s/base/api/source/api.env
- infra/k8s/base/ops/kustomization.yaml
- infra/k8s/base/db/source/bootstrap/0004_app_linear_baseline.sql.gz
- infra/k8s/base/db/source/bootstrap/0005_management_linear_baseline.sql.gz
- packages/orm/src/entities/channel/channel.ts
- packages/orm/src/services/channel/channel.ts
- packages/helpers/src/dtos/channel/channel.ts
- packages/helpers/src/dtos/index.ts
- packages/helpers/src/dtos/podcast-index/podcastsByTag.ts
- packages/helpers/src/dtos/podcast-index/valueByEpisodeGuid.ts
- packages/helpers/src/dtos/podcast-index/valueBatchByEpisodeGuid.ts
- packages/parser-mapping/src/addByRSS/boost.ts
- packages/external-services-podcast-index/src/index.ts
- packages/worker-commands/src/registry.ts
- apps/workers/src/commands/podcastIndex/value/updateAll.ts
- apps/workers/src/commands/index.ts
- apps/workers/src/lib/startup/categoriesForCommand.ts
- apps/workers/package.json
- apps/workers/ENV.md
- apps/workers/APPS-WORKERS.md
- apps/api/src/test/e2e-artist-albums-fixture.test.ts
- apps/mobile/src/lib/playback/engineSourceAdoption.ts
- apps/mobile/src/lib/playback/buildChannelFromDownload.ts
- apps/mobile/src/lib/playback/buildChannelFromDownload.test.ts
- apps/mobile/src/lib/playback/mediaEngineSourceMeta.test.ts
- apps/mobile/src/lib/playback/verifiedArtists.test.ts
- apps/mobile/src/lib/share/shareUrl.test.ts
- apps/mobile/src/lib/remoteItems/remoteItemListEntries.test.ts
- apps/mobile/src/screens/home/homeFeedData.test.ts
- apps/mobile/src/screens/album/albumTrackRows.test.ts
- apps/mobile/src/downloads/downloadRowIdentity.test.ts
- apps/mobile/src/data/repositories/subscriptionsMerge.test.ts
- apps/mobile/src/components/player/fullPlayerRows.test.ts
- apps/web/src/utils/mediaPlayer/mediaPlayerInfoResolution.test.ts
- apps/web/src/utils/addByRSS/deviceArtistLinks.test.ts
- apps/web/src/lib/crossDevicePlayback/remotePlayerInfo.test.ts
- apps/web/src/lib/crossDevicePlayback/playbackResource.test.ts
- apps/web/src/components/embed/__tests__/EmbedListRow.test.tsx
- packages/playback-core/src/__tests__/resolvePlaybackLoadDecision.test.ts
- packages/playback-core/src/__tests__/autoQueueWalk.test.ts
- packages/playback-core/src/__tests__/autoQueue.test.ts
- tools/qa/docs/faker/05b-channel-core.md
- tools/qa/docs/faker/05e-channel-value-podroll.md

## Tests

No new unit test, API integration test, Playwright spec, or Maestro flow. The worker has no test. No route changes. `apps/api/openapi.yml` and `apps/management-api/openapi.yml` do not name the field, so they stay as they are.

The fixture files in ## Files drop the property so those object literals still assign to `DTOChannel`. That is the compile check. Do not add a test whose only assertion is that the property is absent.

## Release scratchpad

```markdown
## Drop the Podcast Index value flag

- Surfaces: api, workers, k8s, web, mobile
- Change: `channel.has_podcast_index_value` is gone from the database and from channel JSON. Value recipients come from the RSS parse into `channel_values` and `item_values`. The worker `podcastIndexValueUpdateAll` is gone. It logged Podcast Index feed ids from a by-tag call and did not save recipients.
- Who notices: operators who ran that worker, and deployments that wait on the app migration marker. Listeners still boost from parsed value rows.
- Operator steps: app migrations run through `0019_drop_channel_has_podcast_index_value.sql`. `API_EXPECTED_MIGRATION_FILENAME` is that file. The management marker stays `0002_nano_id_v2_min_7.sql`.
```

## Column

`0001_app_schema.sql` creates `channel.has_podcast_index_value boolean DEFAULT false` (the `channel` table, next to `has_value_time_splits`) and names it in the `COPY public.channel` column list. Leave `0001` as it is, including that `COPY`. Add the next app migration. Do not edit a later file to put the drop back into `0001`.

New file `infra/k8s/base/ops/source/database/linear-migrations/app/0019_drop_channel_has_podcast_index_value.sql`:

```sql
-- Channel value rows come from the RSS parse.

ALTER TABLE public.channel
  DROP COLUMN has_podcast_index_value;
```

Plain `DROP COLUMN`. The column exists because `0001` created it. No `IF EXISTS`. No index on this column. `has_value_time_splits` stays.

`infra/k8s/base/ops/kustomization.yaml`:

- In `podverse-ops-migration-scripts` literals, set `API_EXPECTED_MIGRATION_FILENAME=0019_drop_channel_has_podcast_index_value.sql`.
- Leave `MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME=0002_nano_id_v2_min_7.sql`.
- Under `podverse-ops-app-linear-migrations` `files`, add `source/database/linear-migrations/app/0019_drop_channel_has_podcast_index_value.sql` after the `0018_account_max_add_by_rss_feeds_unlimited.sql` line.

`infra/k8s/base/api/source/api.env` line `API_EXPECTED_MIGRATION_FILENAME`: same filename, unquoted. Leave `infra/k8s/base/management-api/source/management-api.env` on `0002_nano_id_v2_min_7.sql`.

The init containers in `infra/k8s/base/api/deployment.yaml` and `infra/k8s/base/management-api/deployment.yaml` already read those env vars. Leave the YAML.

From the repo root, the implementing agent runs `make db_regen_linear_baseline`, then `make db_verify_linear_baseline`. Leave the regenerated `0004_app_linear_baseline.sql.gz` and `0005_management_linear_baseline.sql.gz` in the tree. Do not hand-edit either archive. If regen cannot run, stop and report that. Do not commit a migration without the regenerated archives.

## Entity and DTO

`packages/orm/src/entities/channel/channel.ts`: delete the `@Column` for `has_podcast_index_value` (the boolean that defaults to false, directly above `has_value_time_splits`). Leave `has_value_time_splits`.

`packages/orm/src/services/channel/channel.ts`: delete `has_podcast_index_value?: boolean` from the `ChannelDto` type (the argument of `ChannelService.update`). `update` copies that type onto the entity with `applyProperties`. Leave `has_value_time_splits`. No caller passes the flag today. `compatChannelDto` in `packages/parser-mapping/src/compat/partytime/channel.ts` does not set it. Leave that function.

`packages/helpers/src/dtos/channel/channel.ts`: delete `has_podcast_index_value: boolean` from `DTOChannel`. Leave `has_value_time_splits`.

Channel JSON is the channel row `res.json` returns from `apps/api/src/controllers/channel.ts`. After the column is gone, the key is gone from that JSON. Do not add a mapper to strip it, and do not add the key to OpenAPI.

`channel_item.payload_json` stores a `DTOItem`. `playbackContentRepository.getLocalChannelForItem` reads a nested `channel` on that item. A phone that already saved `has_podcast_index_value` on that nested channel keeps the key until the row is rewritten. Nothing reads it after this change. Do not add a SQLite migration, a payload version, or a cache wipe.

## Every remaining read and write

Delete the property. Leave `has_value_time_splits` on the same object.

Production writers:

- `packages/parser-mapping/src/addByRSS/boost.ts` `buildAddByRssBoostChannel`: delete `has_podcast_index_value: channelValues.length > 0`. Keep `channel_values: channelValues` and `has_value_time_splits`. Later plans add `buildAddByRssBoostItem` and `buildAddByRssBoostSheetItem` in this file. Delete this one property and leave those functions in place if they are already there. Do not rewrite them.
- `apps/mobile/src/lib/playback/engineSourceAdoption.ts` `buildChannelFromEngineMeta`: delete `has_podcast_index_value: false`.
- `apps/mobile/src/lib/playback/buildChannelFromDownload.ts` `buildChannelFromDownload`: delete `has_podcast_index_value: false`.

Fixture literals, same deletion, every occurrence (`has_podcast_index_value: false`):

- `packages/playback-core/src/__tests__/resolvePlaybackLoadDecision.test.ts`
- `packages/playback-core/src/__tests__/autoQueueWalk.test.ts`
- `packages/playback-core/src/__tests__/autoQueue.test.ts`
- `apps/web/src/utils/mediaPlayer/mediaPlayerInfoResolution.test.ts` (four literals)
- `apps/web/src/utils/addByRSS/deviceArtistLinks.test.ts`
- `apps/web/src/lib/crossDevicePlayback/remotePlayerInfo.test.ts`
- `apps/web/src/lib/crossDevicePlayback/playbackResource.test.ts`
- `apps/web/src/components/embed/__tests__/EmbedListRow.test.tsx`
- `apps/mobile/src/screens/home/homeFeedData.test.ts`
- `apps/mobile/src/screens/album/albumTrackRows.test.ts`
- `apps/mobile/src/lib/share/shareUrl.test.ts`
- `apps/mobile/src/lib/remoteItems/remoteItemListEntries.test.ts`
- `apps/mobile/src/lib/playback/verifiedArtists.test.ts`
- `apps/mobile/src/lib/playback/mediaEngineSourceMeta.test.ts`
- `apps/mobile/src/lib/playback/buildChannelFromDownload.test.ts`
- `apps/mobile/src/downloads/downloadRowIdentity.test.ts`
- `apps/mobile/src/data/repositories/subscriptionsMerge.test.ts`
- `apps/mobile/src/components/player/fullPlayerRows.test.ts`

After the interface drops the field, a literal that still sets it fails excess-property checking. Delete the key. Do not silence that with `as`.

`tools/qa/docs/faker/05b-channel-core.md` is a documented generator, not compiled code. Its `INSERT INTO channel` names the column. Remove `has_podcast_index_value` from `GeneratedChannel`, from `generate` (the `hasPodcastIndexValue` local and the return field), and from the `INSERT` column list and value list. `has_value_time_splits` stays, as its own `faker.datatype.boolean({ probability: 0.3 })`, no longer combined with the removed flag.

`tools/qa/docs/faker/05e-channel-value-podroll.md` skips value rows when `channel.has_podcast_index_value` is false. Replace that check with a local `const includeValue = faker.datatype.boolean({ probability: 0.3 })` and `if (!includeValue)`. The documented value rows stay optional. They do not read a channel column.

Repo search of `has_podcast_index_value` outside `.llm/plans/` is the list above plus `0001_app_schema.sql`. After this change, the only remaining hit in product and docs is that `0001` definition and its `COPY`, which the new migration drops on a full apply.

## Podcast Index value-id client

`packages/external-services-podcast-index/src/index.ts`, class `PodcastIndexService`:

- Remove `PodcastsByTagResponse` from the type import (the import that also brings `EpisodeByGuidResponse` and the other response types).
- Delete `valueGetByPodcastIds` and `valueGetByPodcastIdsRecursively`, and the `// Value` comment above them (the methods that GET `${this.baseUrl}/podcasts/bytag?podcast-valueTimeSplit=true&max=5000&start_at=`).
- Leave `episodeGetByGuid` and `paginatedRequestExtraParams`. Other methods still call `paginatedRequestExtraParams`.

Those two methods are the only callers of `podcasts/bytag` and of `PodcastsByTagResponse`.

Delete these files. Nothing else imports them except the barrel:

- `packages/helpers/src/dtos/podcast-index/podcastsByTag.ts` (`PodcastsByTagResponse`)
- `packages/helpers/src/dtos/podcast-index/valueByEpisodeGuid.ts` (`ValueByEpisodeGuidResponse`)
- `packages/helpers/src/dtos/podcast-index/valueBatchByEpisodeGuid.ts` (`ValueBatchByEpisodeGuidResponse`)

The last two types have no client method. They are the Podcast Index value-by-episode-guid response shapes. Remove them with the by-tag call.

`packages/helpers/src/dtos/index.ts`: delete these three lines, and leave the `searchPodcasts` and `episodeByGuid` exports:

```typescript
export * from './podcast-index/podcastsByTag.js';
export * from './podcast-index/valueBatchByEpisodeGuid.js';
export * from './podcast-index/valueByEpisodeGuid.js';
```

`apps/api/src/test/e2e-artist-albums-fixture.test.ts`: delete the `valueGetByPodcastIds` and `valueGetByPodcastIdsRecursively` entries in `podcastIndexMocks`. The mock is a stand-in that throws if a live Podcast Index method runs. Those two keys are the only references left after the methods are gone.

## Worker

`podcastIndexValueUpdateAll` in `apps/workers/src/commands/podcastIndex/value/updateAll.ts` is the whole command: `getPodcastIndexService().valueGetByPodcastIds()` and `console.warn('podcastIndexFeedIds', podcastIndexFeedIds)`. Delete that file.

- `apps/workers/src/commands/index.ts`: delete the import from `@workers/commands/podcastIndex/value/updateAll.js` and the `podcastIndexValueUpdateAll` property on the default export.
- `packages/worker-commands/src/registry.ts`: delete the `WORKER_COMMAND_DEFS` object whose `name` is `podcastIndexValueUpdateAll` (label `Podcast Index: update all value blocks`, `example_cli` `npm run podcast_index_value_update_all -w apps/workers`). `KNOWN_COMMANDS` is derived from that array. `apps/workers/src/commands/commandNames.ts` re-exports it. Leave `commandNames.ts`.
- `apps/workers/src/lib/startup/categoriesForCommand.ts`: delete `'podcastIndexValueUpdateAll'` from `BASE_PODCAST_INDEX_COMMANDS`. Leave `podcastIndexTrendingPodcastsGet` and `devDiscoverArtistPublisherFeeds` in that array.
- `apps/workers/package.json`: delete the `podcast_index_value_update_all` script.
- `apps/workers/ENV.md`: in the `Base + Podcast Index` row, the commands cell becomes `podcastIndexTrendingPodcastsGet`. Leave the rest of that table.
- `apps/workers/APPS-WORKERS.md`: delete the table row `npm run podcast_index_value_update_all` / `Update all value blocks`.

No CronJob runs this command. No k8s workload change beyond the migration marker.

## Leave in place

- `has_value_time_splits` on the entity, `ChannelDto`, `DTOChannel`, and every fixture.
- RSS value mapping and `ChannelValueService` / `ItemValueService`. Plan 20 owns the re-parse gaps. This plan does not edit `packages/parser` or `packages/parser-mapping/src/compat/partytime/value.ts`.
- PayPal, Patreon, and Buy Me a Coffee value blocks.
- `episodeGetByGuid` and every other Podcast Index method.
- Player fetch logic. A missing `channel_values` array is what tells the player to load the channel. That behavior is R44 (plan 41) and R46. Do not edit plan 40, plan 41, or `tools/web/seed-e2e.mjs`.
