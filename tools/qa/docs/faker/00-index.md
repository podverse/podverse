# Fake Data Generator - Documentation Index

## Overview

This documentation describes the fake data generation system for podverse-qa. The system generates realistic test data for all database tables.

## Excluded Features (Deferred)

The following features are **excluded** from this initial implementation and will be completed separately after all planned work is done:

### Add-by-RSS Data

All `add_by_rss_*` related data is deferred because these involve JSON columns with potentially open-ended, complex data structures:

- **`AccountFollowingAddByRSSChannel`** - User-added custom RSS feeds
- **`PlaylistResource.add_by_rss_hash_id`** - References to add-by-RSS items in playlists
- **`PlaylistResource.add_by_rss_resource_data`** - JSON blob for add-by-RSS playlist items
- **`QueueResource.add_by_rss_hash_id`** - References to add-by-RSS items in queues
- **`QueueResource.add_by_rss_resource_data`** - JSON blob for add-by-RSS queue items

These fields will be set to `null` in the initial implementation. A separate planning and implementation phase will handle add-by-rss data generation after the core faker system is complete.

> **Note:** The LLM skills in `08-llm-skills.md` should be updated after the add-by-rss work is completed to include guidance for these features.

## Implementation Order

Follow these files in order when implementing:

### Phase 1: Foundation & Reference
| File | Description | Lines |
|------|-------------|-------|
| [01-architecture.md](./01-architecture.md) | Overall architecture, config, CLI | ~455 |
| [03-lookup-tables.md](./03-lookup-tables.md) | Reference for enums (don't generate) | ~713 |

### Phase 2: Media Server Infrastructure
| File | Description | Lines |
|------|-------------|-------|
| [02a-media-server-core.md](./02a-media-server-core.md) | HTTP server setup & routing | ~180 |
| [02b-media-image-generator.md](./02b-media-image-generator.md) | PNG/JPEG image generation | ~120 |
| [02c-media-audio-generator.md](./02c-media-audio-generator.md) | MP3/OGG/WAV audio generation | ~180 |
| [02d-media-video-generator.md](./02d-media-video-generator.md) | MP4/WebM video generation | ~280 |
| [02e-media-rss-chapters-transcripts.md](./02e-media-rss-chapters-transcripts.md) | RSS feeds, chapters, transcripts | ~200 |

### Phase 3: Account Generators
| File | Description | Lines |
|------|-------------|-------|
| [04a-account-core.md](./04a-account-core.md) | Account, Credentials, Profile | ~180 |
| [04b-account-settings.md](./04b-account-settings.md) | Settings, Locale, Notifications | ~120 |
| [04c-account-membership.md](./04c-account-membership.md) | Membership status, Verification | ~120 |
| [04d-account-following.md](./04d-account-following.md) | Following relationships | ~130 |
| [04e-account-devices-purchases.md](./04e-account-devices-purchases.md) | Devices & purchases | ~220 |

### Phase 4: Feed & Channel Generators
| File | Description | Lines |
|------|-------------|-------|
| [05a-feed-core.md](./05a-feed-core.md) | Feed, FeedLog | ~130 |
| [05b-channel-core.md](./05b-channel-core.md) | Channel, About, Description, Settings | ~180 |
| [05c-channel-media.md](./05c-channel-media.md) | Category, Image, Person (2 each) | ~120 |
| [05d-channel-extras.md](./05d-channel-extras.md) | Chat, License, Location, etc. | ~280 |
| [05e-channel-value-podroll.md](./05e-channel-value-podroll.md) | Value4Value, Podroll, Publisher | ~220 |

### Phase 5: Item Generators
| File | Description | Lines |
|------|-------------|-------|
| [06a-item-core.md](./06a-item-core.md) | Item, About, Description | ~180 |
| [06b-item-enclosure.md](./06b-item-enclosure.md) | Enclosures, Sources, Integrity | ~150 |
| [06c-item-media.md](./06c-item-media.md) | Image, Person (2 each) | ~80 |
| [06d-item-chapters.md](./06d-item-chapters.md) | Chapters, ChaptersFeed | ~150 |
| [06e-item-extras.md](./06e-item-extras.md) | License, Location, Transcripts, etc. | ~280 |
| [06f-item-value.md](./06f-item-value.md) | Value with TimeSplits | ~220 |
| [06g-live-item.md](./06g-live-item.md) | LiveItem | ~80 |

### Phase 6: User Content & Stats
| File | Description | Lines |
|------|-------------|-------|
| [07a-clips.md](./07a-clips.md) | Clip generator | ~100 |
| [07b-playlists.md](./07b-playlists.md) | Playlist, PlaylistResource | ~180 |
| [07c-queues.md](./07c-queues.md) | Queue, QueueResource | ~140 |
| [07d-stats-aggregated.md](./07d-stats-aggregated.md) | All aggregated stats | ~150 |
| [07e-stats-events.md](./07e-stats-events.md) | Track events | ~180 |
| [07f-misc.md](./07f-misc.md) | MembershipClaimToken, OnDemandParserEvent | ~100 |

### Phase 7: LLM Integration
| File | Description | Lines |
|------|-------------|-------|
| [08-llm-skills.md](./08-llm-skills.md) | Cursor rules for maintenance | ~400 |

## Quick Reference

### Row Counts (baseCount=100)

| Category | Total Rows |
|----------|------------|
| Accounts | ~104 accounts + ~2,500 related rows |
| Feeds/Channels | 100 + ~1,800 related rows |
| Items | 200 + ~4,500 related rows |
| User Content | ~4,500 rows (clips, playlists, queues) |
| Stats | ~4,000 rows |
| **Total** | **~17,500 rows** |

### Key Dependencies

```
Phase 1 → Phase 2 (media URLs needed)
Phase 2 → Phase 3, 4, 5 (accounts, channels, items)
Phase 3 + 4 + 5 → Phase 6 (user content needs content IDs)
Phase 6 → Phase 6 stats (stats need all entity IDs)
```

### Getting Started

1. Start with `01-architecture.md` for setup
2. Implement media server (02a-02e)
3. Implement generators in order (03 is reference only)
4. Test each phase before moving to next
5. Keep `08-llm-skills.md` for maintenance reference
