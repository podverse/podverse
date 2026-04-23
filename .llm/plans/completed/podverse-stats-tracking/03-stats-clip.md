# Stats — clip

## Triggers

1. Clip detail page (logged-in).
2. Playback when `clip` is non-null in `useMediaPlayerResourceUpdate`.

## Anchors

- Page: [`apps/web/src/app/clip/[clip_id]/ClipPageClient.tsx`](../../../apps/web/src/app/clip/[clip_id]/ClipPageClient.tsx).
- Playback: [`useMediaPlayerResourceUpdate.tsx`](../../../apps/web/src/hooks/useMediaPlayerResourceUpdate.tsx).

## API

`{ clip_id_text }` → [`statsTrackEventClip.ts`](../../../apps/api/src/controllers/stats/statsTrackEventClip.ts).
