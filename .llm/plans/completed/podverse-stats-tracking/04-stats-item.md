# Stats — item (episode)

## Triggers

1. Episode page load (logged-in).
2. Playback when `item` is non-null (episode / chapter / full-item flows). Item soundbite playback uses parent item `id_text`.

## Anchors

- Page: episode client under [`apps/web/src/app/episode/[item_id]/`](../../../apps/web/src/app/episode/[item_id]/).
- Playback: [`useMediaPlayerResourceUpdate.tsx`](../../../apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx).

## API

`{ item_id_text }` → [`statsTrackEventItem.ts`](../../../apps/api/src/controllers/stats/statsTrackEventItem.ts).
