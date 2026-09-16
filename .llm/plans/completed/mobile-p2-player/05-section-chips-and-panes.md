# 05 — Section chips and panes

Decisions 18–24 in [00-SUMMARY.md](00-SUMMARY.md) · Detail
[750](/docs/proposals/mobile/_master-plan_/phase-2/details/750-player-section-chips-and-panes.md)

Fill the section below the player with the same chips and panes episode detail already offers, by
extracting its loader rather than writing a second one.

## Extract the pane loader first

`EpisodeDetailScreen` owns per-pane loading today: which chips are available from evidence, the
cache-first read, the server reconcile, empty and error states. Move that into a shared hook (for
example `useEpisodePaneData`) under `apps/mobile/src/screens/episode/`, and have episode detail call it
in this same change.

Extract, do not copy. Two copies of "load chapters for an item" drift, and the second copy is the one
that forgets that a 404 means empty
([`mobile-data-layer`](/.cursor/skills/mobile-data-layer/SKILL.md) — cache first, then reconcile;
nested lists are empty, not errors).

The hook keeps the existing behavior: `emptyIfNotFound` on nested fetches, cached value first, server
reconcile that only re-renders on a real difference.

## Chips

Reuse episode detail's chip resolution — Summary, Clips, Chapters, Official clips, Transcript — with the
same evidence-based visibility, so the player never offers a chip that resolves to nothing.

Selection persists through the existing `item:`-scoped pref that episode detail uses, so the two screens
agree ([`filter-sort-persistence`](/.cursor/rules/filter-sort-persistence.mdc) — device-local, never
server-synced). Picking Chapters in the player means episode detail opens on Chapters.

## Panes

Each pane renders as the list's section data, reusing the episode detail row components:

| Chip           | Pane                                                                    |
| -------------- | ----------------------------------------------------------------------- |
| Summary        | Item description, same renderer as episode detail                        |
| Clips          | User clips list, same rows and empty state                               |
| Chapters       | Chapter list, tapping seeks — the player is right there, so make it work |
| Official clips | Soundbites, same rows                                                    |
| Transcript     | Plain transcript pane, no follow-along highlight                         |

Transcript is plain on purpose: highlight and scrubber coupling stay deferred in
[598](/docs/proposals/mobile/_master-plan_/phase-2/details/598-defer-player-transcript-chrome.md).

Pane content may jump when a chip changes. The player region above it may not — if a pane can push the
region, the region is not fixed and step 04 regressed.

## When the now-playing item changes

Scroll back to the player and load the new item's remembered chip. A pane left in place would keep
describing an episode that stopped playing, which is worse than a scroll the user did not ask for.

## Tests

Unit-test the extraction seam, not the chip visuals:

- The shared hook returns empty (not error) for a nested 404, on every pane that fetches a list.
- Chip availability from evidence matches what episode detail resolves for the same item.
- An item change resolves to the new item's remembered chip, falling back to Summary when it has none.

Episode detail must not regress; its existing tests cover the extraction.

## Out of scope

No transcript coupling, no chip reordering, no new pane types. Do not change the episode detail layout
while extracting from it.
