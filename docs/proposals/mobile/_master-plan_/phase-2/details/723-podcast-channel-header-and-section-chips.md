# 723-podcast-channel-header-and-section-chips

**Master step:** P2.1.2
**Model (author + implement):** Codex 5.3
**Status:** done

## Scope

Rebuild the podcast detail screen shell so the layout matches the locked decisions: compact channel
header, horizontal section chips **below** the header, leading sort, and an always-visible list
filter. Extract reusable primitives so album / artist / future video can share the chrome without
locking podcast styles into those mediums.

### Shared primitives

| Component        | Responsibility                                                               |
| ---------------- | ---------------------------------------------------------------------------- |
| `ChannelHeader`  | Square `CoverImage`, title, subscribe control slot, truncated description    |
| Section chip row | Horizontal scroller with a **leading** slot (sort) and medium-specific chips |

Start from [`MediaTypeSelector`](apps/mobile/src/screens/home/MediaTypeSelector.tsx) (already has a
`leading` prop) and [`BrowseSortChip`](apps/mobile/src/screens/browse/BrowseSortChip.tsx). Prefer
promoting into `apps/mobile/src/components/` rather than leaving podcast-only copies.

### Podcast shell

1. Stack title stays generic **Podcast** via `ThemedStackHeader`.
2. Trailing header actions (Share, Bell, Gear) are wired in detail
   [726](726-podcast-settings-and-header-bell.md); this detail leaves the `headerRight` slot ready
   (`HeaderBarAction`).
3. Body: `ChannelHeader` → chip row → always-visible title filter → `FlatList` for the active
   section (lists filled in [724](724-podcast-section-lists.md)).
4. Drop the tablet two-pane split on this screen.
5. Persist **section tab + sort + range** per channel in `detailListPrefs` (replace alphabetical with
   recent / oldest / top; add range when sort is top). Device-local only.

### Sort control

- Three sort options fit a chip / sheet pattern (2–3 → chips or a compact sort chip).
- Range has 4+ options — use a push option-list or the existing Browse range sheet pattern when
  sort is `top` ([`mobile-settings-option-density`](/.cursor/rules/mobile-settings-option-density.mdc)).

## Acceptance criteria

- Podcast detail shows cover + title + Subscribe + truncated description; no duplicate in-body
  “Podcast” heading / card chrome.
- Chip row sits **below** the header and includes leading sort + Episodes always; Official Clips only
  when soundbites exist; Clips; About; Podroll only when present. No Settings chip. No Boosts chip.
- Sort options are recent / oldest / top; range appears for top; alphabetical is gone.
- Tab + sort + range restore per channel on reopen.
- Filter input is always visible, title-only, session-only (not persisted), Home-matching semantics.
- Shared header / chip primitives live under `components/` with medium slots; podcast is the first
  consumer.
- Screen reader: chips have role/selected state; filter has a label; header actions have labels.
- E2E covers chip switch and sort restore for a known channel.

## Web parity references

- [`PodcastPageListHeader.tsx`](apps/web/src/app/podcast/[channel_id]/PodcastPageListHeader.tsx)
- [`PodcastPageDropdownConfig.ts`](apps/web/src/app/podcast/[channel_id]/PodcastPageDropdownConfig.ts)
- [`CorePodcastHeader`](apps/web/src/components/Core/Podcast/CorePodcastHeader.tsx)
- Mobile: [`PodcastDetailScreen.tsx`](apps/mobile/src/screens/podcast/PodcastDetailScreen.tsx)
- Prefs: [`detailListPrefs.ts`](apps/mobile/src/prefs/detailListPrefs.ts)
- Rule: [`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc)

## Verification

```bash
# Mobile Maestro
npm run mobile:e2e:test -- podcast-episode
open .artifacts/mobile-e2e-reports/latest/ios-phone/index.html
open .artifacts/mobile-e2e-reports/latest/android-phone/index.html
```
