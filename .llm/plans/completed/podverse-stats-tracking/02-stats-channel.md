# Stats — channel

## Triggers

1. Podcast/channel detail page load (logged-in).
2. Playback when `DTOChannel` is set from Podverse data in `useMediaPlayerResourceUpdate` (not add-by-RSS-only).

## Anchors

- Page: [`apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx`](../../../apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx).
- Playback: [`apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx`](../../../apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx).

## API

`{ channel_id_text }` → [`statsTrackEventChannel.ts`](../../../apps/api/src/controllers/stats/statsTrackEventChannel.ts).

## Scope

Do **not** track from channel list/search GETs — detail page + playback only.
