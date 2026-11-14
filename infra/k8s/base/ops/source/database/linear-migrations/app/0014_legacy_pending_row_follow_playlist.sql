-- follow_playlist waits on a v4 playlist id until that playlist's owner is copied.

ALTER TABLE public.legacy_pending_row
  DROP CONSTRAINT legacy_pending_row_kind_check;

ALTER TABLE public.legacy_pending_row
  ADD CONSTRAINT legacy_pending_row_kind_check
  CHECK (row_kind IN (
    'follow_account',
    'follow_playlist',
    'playlist_clip',
    'history',
    'queue',
    'now_playing',
    'snapshot_clip',
    'snapshot_playlist_member',
    'subscription'
  ));
