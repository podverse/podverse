# 02 — Web: More menu + batch membership (core + Add-by-RSS)

**Implemented hook names (use in audits):** [useLikesItemBatch](../../../apps/web/src/hooks/useLikesItemBatch.ts), [useLikesClipBatch](../../../apps/web/src/hooks/useLikesClipBatch.ts), [useLikesAddByRssBatch](../../../apps/web/src/hooks/useLikesAddByRssBatch.ts) — not `usePlaylistItemLikesBatch` unless renamed.

## Hook (behavior)

- Batching hooks: `POST` [likes membership] for visible id sets; `toggle` with optimistic update. **No** membership or toggle `POST` when `!loggedInAccount`.

## Required surface checklist (logged-in + logged-out)

Every row must **still pass** `likeRow` (or header equivalent) when the surface is likeable. Logged-out: **affordance visible**; on use → **login modal** (see **Chosen pattern** below). Verify each:

| # | Surface | Key files (audit) |
|---|--------|---------------------|
| 1 | Episode list rows (not `live_item`) | [ListEpisodeNodes](../../../apps/web/src/components/List/Podcasts/Episodes/ListEpisodeNodes.tsx) → [ListEpisodeRow](../../../apps/web/src/components/List/Podcasts/Episodes/ListEpisodeRow.tsx) |
| 2 | Music track rows | [ListTrackNodes](../../../apps/web/src/components/List/Music/Albums/Tracks/ListTrackNodes.tsx) → [ListTrackRow](../../../apps/web/src/components/List/Music/Albums/Tracks/ListTrackRow.tsx) |
| 3 | Clip list rows | [ListClips](../../../apps/web/src/components/List/Clips/ListClips.tsx) → [ListClipRow](../../../apps/web/src/components/List/Clips/ListClipRow.tsx) |
| 4 | Add-by-RSS episode list | [AddByRSSEpisodeNodes](../../../apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeNodes.tsx) + [AddByRSSEpisodeRow](../../../apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeRow.tsx) — do not drop `likeRow` only when logged out; fix add-by-rss `id` gating if needed |
| 5 | Episode play header (core) | [CoreEpisodeHeaderPlaySection](../../../apps/web/src/components/Core/Podcast/Episodes/CoreEpisodeHeaderPlaySection.tsx) |
| 6 | Clip play header | [ClipHeaderPlaySection](../../../apps/web/src/components/Media/Clip/ClipHeaderPlaySection.tsx) |
| 7 | Add-by-RSS header | [AddByRSSEpisodeHeader](../../../apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeHeader.tsx) (and [AddByRSSEpisodeDetailHeader](../../../apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader.tsx) if used) |
| 8 | VTS heart (when 04 enables it) | [MediaPlayerInfoModal](../../../apps/web/src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx) + [MediaPlayerVtsOverrideLikeButton](../../../apps/web/src/components/MediaPlayer/Modal/MediaPlayerVtsOverrideLikeButton.tsx) — [04](./04-web-full-player-vts-heart.md) |

**Chosen pattern (default for this plan):**

- **Default: Option A** for all row/menu surfaces: the row’s like action runs **if `!loggedInAccount` → `setModalLoginRequired({ message: tInstructions('login_to_like') })`**; else `likeRow.onToggle()`. (Matches current [ListEpisodeRow](../../../apps/web/src/components/List/Podcasts/Episodes/ListEpisodeRow.tsx) `onLikeFromMenu`.)
- **Use Option B only when there is no row/menu wrapper** (typically header/player controls): extend hooks with **`onRequireLogin: () => void`** so `toggle(id)` triggers login flow instead of silent no-op.

Do **not** leave `toggle` a silent no-op for logged-out when the user can see a like control; Option A is baseline, Option B is exception-only.

## Exclusions and parity

- **`live_item` rows:** **no** like (per product); not in the checklist.
- **Grid cards/nodes:** out of scope for this phase unless explicitly added in a follow-up. This phase guarantees parity for listed row/header/player surfaces.
- **Add-by-RSS:** same toggle/membership semantics as core; parity via components in the checklist — follow [add-by-rss parity skill](../../../../.cursor/skills/add-by-rss-parity-sync/SKILL.md) when changing either side.

## i18n

- Add or reuse keys in [en-US.json](../../../../apps/web/i18n/originals/en-US.json), then per [.cursor rules i18n](../../../../.cursor/rules/i18n-management.mdc) for other locales and overrides.

## Auth (logged-out) — short recap

- **Show** like affordance (see checklist + Option A / B). **On use:** login modal; **no** `POST` membership; **no** `reqPlaylistToggleLike` until session exists.
- [04](./04-web-full-player-vts-heart.md) VTS heart, when live: same rule.

**DoD (02):** [ ] all checklist rows/headers + VTS use Option A or B; [ ] no `likeRow` omitted only because of `!loggedInAccount` where the episode is likeable. **Tests:** see [06](./06-tests-e2e-and-verification.md) minimum / stretch.
