# 750-player-section-chips-and-panes

**Master step:** P2.1.4
**Model (author + implement):** Codex 5.3
**Status:** planned

## Scope

The chips row that peeks above the bottom edge, and the content it loads below the player: **Summary,
Clips, Chapters, Official clips, Transcript**.

This replaces legacy's horizontal swipe carousel (viewer / show notes / clips / chapters / transcript
/ comments / chat with page dots). Vertical scroll plus chips is the nextgen pattern: it matches
episode detail, so a user learns one interaction, and it drops the dots that never told anyone how
many pages there were.

### Reuse, do not rebuild

Episode detail already has all of this — chip resolution from evidence, per-tab loading with
loading / empty / error states, clip sort, clip pagination, offline fallbacks. The player must use the
same code, not a parallel copy
([`reuse-beyond-components`](/.cursor/rules/reuse-beyond-components.mdc)):

| Concern          | Existing owner                                                          |
| ---------------- | ----------------------------------------------------------------------- |
| Which chips show | `resolveEpisodeTabs` + `sectionChromeFlags`                             |
| Chip row UI      | `SectionChipRow`                                                        |
| Pane data        | Extract episode detail's `loadTab` into a shared hook both screens call |
| Selection memory | `readEpisodeDetailPrefs` / `writeEpisodeDetailTab`, `item:` scope       |

The pane loader comes out of `EpisodeDetailScreen` into a hook (e.g.
`apps/mobile/src/screens/episode/useEpisodeSectionPanes.ts`) that returns pane state and a loader
per tab. Episode detail switches to it in the same change, so there is one implementation from the
moment it exists rather than a copy that drifts.

### Shared selection

The player and episode detail share the per-item pref. Opening Chapters in the player and then opening
episode detail lands on Chapters — one memory per item, per the
[`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc) contract, device-local.

### Transcript

The chip loads the same plain transcript pane episode detail renders. Follow-along highlighting and
tap-a-line-to-seek stay deferred in
[598](598-defer-player-transcript-chrome.md) — the chip is the part that opens, not the coupling.

### Panes and jumping

Pane height is allowed to change on a chip press; that is the one place the operator accepted movement.
The player region above it never moves ([747](747-player-screen-layout-and-scroll.md)). Chip presses
scroll the pane to its top so a short pane does not leave the user looking at blank space.

### When the now-playing item changes

Scroll back to the player and load the new item's remembered chip, falling back to Summary when it has
none. A pane left where it was would keep describing an episode that stopped playing, which is a worse
surprise than a scroll the user did not ask for.

### No item, no chips

Add-by-RSS targets and livestreams without an item have no chips; the peek band collapses and the
screen does not scroll.

## Acceptance criteria

- Chips show only for evidence the item actually has, matching episode detail exactly.
- Each pane has loading, empty, and error states; a missing nested list reads as empty, never an error.
- Clips paginate and honor the leading sort chip.
- Selection persists per item and is shared with episode detail.
- Episode detail and the player both call the extracted hook — no duplicated fetch logic.
- Offline: cached panes render; uncached panes say so rather than failing.
- Chips expose role and selected state to screen readers.

## Web parity references

- [`EpisodePageList.tsx`](apps/web/src/app/episode/[item_id]/EpisodePageList.tsx) — pane switching and
  fetch-on-tab
- [`EpisodePageListHeader.tsx`](apps/web/src/app/episode/[item_id]/EpisodePageListHeader.tsx) — tab
  inventory and visibility

## Verification

`npm run mobile:e2e:test -- player-screen` and `npm run mobile:e2e:test -- podcast-episode`.
