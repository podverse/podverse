# 04 — Media player: VTS heart, remote metadata, and chapter precedence (full + mini)

Scope: **full-size** player and the **info** strip/section in the **mini** (bottom) media player. Use the **same** resolution logic in both UIs; implement **one** shared entry point (e.g. `getMediaPlayerTitleAndInfoLink(mpItem, currentTime, …)`) so full and mini never disagree.

**UI entry points (name these in PRs; update if files move):**

| Role | File |
|------|------|
| Full / modal | [MediaPlayerInfoModal](../../../apps/web/src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx) |
| Mini — desktop | [MediaPlayerInfoDesktop](../../../apps/web/src/components/MediaPlayer/Desktop/MediaPlayerInfoDesktop.tsx) (uses `mpItem?.title` + channel today) |
| Mini — mobile | [MediaPlayerInfoMobile](../../../apps/web/src/components/MediaPlayer/Mobile/MediaPlayerInfoMobile.tsx) (same idea) |

---

## Data contract (fill as API work lands)

**Blocker for a complete 04:** web must receive **enough** of value-time-split and chapter data on `DTOItem` (or media-player state) to apply precedence. Until then, keep `getResolvedVtsLikeTargetItem` returning `null` and document the gap in a PR.

| Data | Where it should live (target) | Notes |
|------|------------------------------|--------|
| Value time split / remote VTS | `DTOItem` or player-enriched type | “Matching feed in system” = resolved in-catalog item id / route for the remote segment |
| Chapters, each with time range + `toc: boolean` or equivalent | Same item or `mpItem` chapter list from parser/PSP | `toc: false` wins over overlapping non-`toc: false` in same window |
| Ambiguous overlap at same tier | N/A | **First element** in the candidate array |

**Helpers (names suggestive):** [vtsOverrideLikeItem.ts](../../../apps/web/src/utils/mediaPlayer/vtsOverrideLikeItem.ts) — add sibling module for **title/chapter** resolution if the shared function grows too large. **Do not** fork precedence logic between Desktop and Mobile info components.

---

## Metadata, title, and tappable “info” — precedence (highest wins)

When deciding **what to display** (and, where applicable, **where “info” navigation goes**) for a given playback time:

1. **VTS / value time split, remote metadata** (highest)  
   - If a **matching feed is found in our system** for that remote / split, render with **that** resolved info (title, link target, etc.).  
   - **Clicking the info** (or equivalent navigation affordance) should go to the **remote item’s page in Podverse** (the in-catalog item, not a generic or external target).

2. **Chapter with `toc: false`**  
   - Chapter data where **`toc` is `false`** **always** takes precedence over other overlapping **non-`toc: false`** material for that time range.  
   - (I.e. do not let “generic” or other chapter types outrank a `toc: false` chapter when both overlap the same time span.)

3. **All other chapters**  
   - Show normal **chapter** information when it applies.

**Overlap tie-break (when still ambiguous, e.g. multiple candidates at the same tier):** use **whatever is in the first position** in the list/array you are iterating (stable, documented default).

---

## VTS like heart (separate from display precedence)

- [MediaPlayerInfoModal](../../../apps/web/src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx): show the **VTS heart** (no `More` menu) only when a resolved **VTS like target** `DTOItem` is active, consistent with the remote/split product rules above.
- [vtsOverrideLikeItem](../../../apps/web/src/utils/mediaPlayer/vtsOverrideLikeItem.ts) (or adjacent): from `mpItem` + [useMediaPlayerCurrentTime](../../../apps/web/src/contexts/MediaPlayerCurrentTime.tsx) — return resolved child `DTOItem` when the payload includes time splits + linked item; otherwise `null` (no heart). Extend DTOs/API as needed when splits are fully returned to web.
- Heart uses the same membership/toggle behavior as list rows. **Logged-out:** heart remains visible; tap opens login modal, no API (same as [02](./02-web-more-menus-and-membership.md#auth-logged-out-users)).

---

## Tests / verification (see also [06](./06-tests-e2e-and-verification.md))

- If unit tests are added for media title resolution, cover: VTS+feed match, `toc: false` over overlapping non-`toc: false`, generic chapters, and **first-position** tie-break when two chapters overlap with no other rule.

## Completion

- Status: completed
- Note: shared full/mini resolution landed; VTS + chapter precedence verified by targeted tests and E2E harness scenarios.
