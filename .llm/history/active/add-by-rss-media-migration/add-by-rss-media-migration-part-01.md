### Session 1 - 2026-02-05

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Use Common artist/album list components for AddByRSS rows/grid nodes with lightweight mappers.
- Introduce simple Common track row/grid components to align visuals while preserving AddByRSS actions.
- Align AddByRSS track grid items to Common layout by omitting date metadata.

#### Files Modified

- apps/web/src/components/AddByRSS/Artist/AddByRSSArtistRow.tsx
- apps/web/src/components/AddByRSS/Artist/AddByRSSArtistGridNode.tsx
- apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumRow.tsx
- apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumGridNode.tsx
- apps/web/src/components/AddByRSS/Artist/Album/Track/AddByRSSTrackRow.tsx
- apps/web/src/components/AddByRSS/Artist/Album/Track/AddByRSSTrackGridNode.tsx
- apps/web/src/components/AddByRSS/Artist/Album/Track/AddByRSSTrackItemRow.tsx
- apps/web/src/components/AddByRSS/Artist/Album/Track/AddByRSSTrackItemGridItem.tsx
- apps/web/src/components/Common/Artist/Album/Track/CommonTrackRowSimple.tsx
- apps/web/src/components/Common/Artist/Album/Track/CommonTrackGridNodeSimple.tsx
