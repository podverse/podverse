# Mobile — add-by-RSS mapped playback + radii hygiene

**Prerequisite:** Track 9b (PG-6.5) done —
[`.llm/plans/completed/mobile-pg6.5-data-layer/`](../completed/mobile-pg6.5-data-layer/)
**Related detail:** [494-data-layer-add-by-rss-parser-mapping](/docs/proposals/mobile/_master-plan_/details/494-data-layer-add-by-rss-parser-mapping.md)
**Status:** planned (ready for COPY-PASTA execution)

## Goal

Close the remaining detail **494** acceptance gap: play add-by-RSS from the full mapped
`AddByRSSResourceData` (SQLite `mapped_feed_json` via `getMappedFeedByUrl`), not only the slim
4-field list record. Also fix invalid `tokens.radii.full` usages and document the Metro `crypto`
shim briefly.

## Why

Track 9b persisted parser-mapping bundles and offline lists, but
`useAddByRssPlayback` still builds slim resource data. E2E play works via `enclosureUrl`; PG-7
queue/boost needs the full mapped shape. Detail 494 was marked done ahead of that wiring.

## Locked decisions

| Item | Decision |
| ---- | -------- |
| Mapped source | `addByRssRepository.getMappedFeedByUrl` |
| Build payload | `@podverse/parser-mapping` `toIndexItem` + `buildAddByRSSResourceData` (web parity) |
| Fallback | Existing `toAddByRssResourceData(feed)` when no mapped bundle |
| Playback position | Prefer SQLite record `playbackPosition` over mapped defaults |
| E2E | Keep enclosure rewrite (`resolveE2eMediaUrl`); verify `add-by-rss` Maestro area |
| Radii | Design tokens use `round`, not `full` — replace all mobile `tokens.radii.full` |

## Out of scope

- AsyncStorage → SQLite one-shot migrate for pre-9b local feeds
- Queue focus / pull-to-refresh sync
- Moving Search / Playlists `req*` into repositories
- Full visual polish; Track 10 queue mutations

## Critical path

1. Mapped playback (01)
2. Radii + shim docs (02) — independent of 01 but run after for a single verify pass
