# Stats — playlist

## Triggers

1. Playlist detail page (logged-in).
2. Playback while `AutoQueueConfig.playlist_id_text` is set — track once when now-playing updates from playlist queue context.

## Anchors

- Page: [`apps/web/src/app/playlist/[playlist_id]/PlaylistPageClient.tsx`](../../../apps/web/src/app/playlist/[playlist_id]/PlaylistPageClient.tsx).
- Playback: [`useMediaPlayerResourceUpdate.tsx`](../../../apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx) reads [`useAutoQueue`](../../../apps/web/src/contexts/AutoQueue.tsx) `autoQueueConfig.playlist_id_text`.

## API

`{ playlist_id_text }` → [`statsTrackEventPlaylist.ts`](../../../apps/api/src/controllers/stats/statsTrackEventPlaylist.ts).
