# Execution Order

## Quick Reference

| Plan | Status | Blocking |
|------|--------|----------|
| 01-immediate-fix | Partial | None |
| 02-rename-episode-to-item | Pending | 01 |
| 03-add-medium-support | Pending | 02 |
| 04-unify-tracks-page | Pending | 03 |
| 05-consolidate-medium-helpers | Pending | 03 |

## Execution Instructions

### Phase 1: Immediate Bug Fix (01)

**Can be deployed independently.**

```bash
# Remaining work for 01:
# Update AddByRSSListClient.tsx to build items index before map
```

Checklist:
- [x] AddByRSSPodcastPageDetailClient - builds index before map
- [ ] AddByRSSListClient - needs same fix

### Phase 2: Core Refactoring (02, 03, 05)

**Execute together as a breaking change.**

Order:
1. **02-rename-episode-to-item** - File and function renames
2. **03-add-medium-support** - Add mediumId field and filtering
3. **05-consolidate-medium-helpers** - DRY up medium logic

After completing these three:
- Bump DB_VERSION appropriately (consider single bump to v4 or v5)
- Run full TypeScript check
- Test episode functionality end-to-end

### Phase 3: Tracks Enhancement (04)

**Execute after Phase 2.**

This changes the `/add-by-rss/tracks` behavior from showing feeds to showing items. May want user confirmation before implementing.

## Copy-Pasta Prompts

### Plan 01 Completion

```
Complete plan 01-immediate-fix.md:
- Update AddByRSSListClient.tsx to build items index before building ID map
- Follow the same pattern as AddByRSSPodcastPageDetailClient.tsx
```

### Plan 02 Execution

```
Execute plan 02-rename-episode-to-item.md:
- Rename episodeIndex.ts to itemIndex.ts
- Rename episodePath.ts to itemPath.ts
- Update AddByRSSEpisodeIndexItem type to AddByRSSItemIndexItem
- Rename all episode-related functions to item-related
- Update all imports across the codebase
- Bump DB_VERSION and rename stores
```

### Plan 03 Execution

```
Execute plan 03-add-medium-support.md:
- Add mediumId field to AddByRSSItemIndexItem type
- Update toIndexItem to include medium from feed
- Remove isPodcastMedium filter from buildAddByRSSItemsIndex (index ALL items)
- Add mediumFilter parameter to query functions
- Add mediumId index to IndexedDB schema
```

### Plan 04 Execution

```
Execute plan 04-unify-tracks-page.md:
- Update AddByRSSListClient to handle resourceType='tracks' like 'episodes'
- Update/rename AddByRSSEpisodeNodes to AddByRSSItemNodes
- Add mediumFilter and itemType props
- Update itemPath.ts to accept resourceType for URL generation
- Ensure track items link to /add-by-rss/track/{itemIdText}
```

### Plan 05 Execution

```
Execute plan 05-consolidate-medium-helpers.md:
- Create mediumHelpers.ts with canonical implementations
- Export isPodcastMedium, isMusicMedium, isAlbumMedium, isArtistMedium, matchesMediumFilter
- Update resourceType.ts to import from mediumHelpers
- Update itemIndex.ts to import from mediumHelpers
- Update AddByRSSArtistPageClient.tsx to import from mediumHelpers
- Update AddByRSSArtistsPageClient.tsx to import from mediumHelpers
- Remove all duplicate local definitions
```

## DB Version Strategy

Option A: Single bump after all changes
- Plan 02 + 03: DB_VERSION = 4
- Stores renamed, mediumId added, all items cleared for rebuild

Option B: Incremental bumps
- Plan 02: DB_VERSION = 4 (store rename)
- Plan 03: DB_VERSION = 5 (add mediumId index)

Recommendation: Option A for simplicity.
