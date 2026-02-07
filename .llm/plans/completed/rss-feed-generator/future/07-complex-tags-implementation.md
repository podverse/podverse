# Future Plan: Complex Podcast Tags — Full Implementation (Overview)

**Prerequisite:** Sub-plans 01–03 completed. (Sub-plans 04 and 05 were skipped and moved to completed; this plan is self-contained.) Execute when you need generated feeds to include value, alternateEnclosure, liveItem, remoteItem/podroll, or publisher.

**Test data spec:** See [../10-test-data-spec.md](../10-test-data-spec.md). Generator produces nine feed types per set; count = sets; default 20 items per feed (`--items`); multi-value tags use `--multi` (default 2, non-item only). Live items: exactly 1 per feed where applicable; different statuses across feeds. Publisher feeds: remote items have medium tag; same medium for both remote items. remoteItem/podroll/publisher: point to already-existing feeds at localhost:2111; first feed must not include them.

## Execution order

Execute sub-plans in order: **07a → 07b → 07c → 07d**. (07a, 07b, 07c can be done in any order relative to each other; 07d must be last because it requires the generator-loop change to pass "writtenSoFar" feed URLs.)

| Sub-plan | Scope | Link |
| -------- | ----- | ---- |
| **07a** | podcast:value (channel + item) | [07a-value.md](07a-value.md) |
| **07b** | podcast:alternateEnclosure (item) | [07b-alternate-enclosure.md](07b-alternate-enclosure.md) |
| **07c** | podcast:liveItem (channel) | [07c-live-item.md](07c-live-item.md) |
| **07d** | podcast:remoteItem, podroll, publisher (channel) | [07d-remote-item-podroll-publisher.md](07d-remote-item-podroll-publisher.md) |

Remove or update placeholder comments in the generator (from Sub-Plan 04) as each sub-plan is implemented.

## Optional spec links

- Value: [Podcast Namespace value spec](https://github.com/Podcastindex-org/podcast-namespace/blob/main/value/value.md)
- General: [Podcast Namespace 1.0 docs](https://github.com/Podcastindex-org/podcast-namespace/blob/main/docs/1.0.md)

Partytime and parser-mapping remain the source of truth for XML shape and validation.
