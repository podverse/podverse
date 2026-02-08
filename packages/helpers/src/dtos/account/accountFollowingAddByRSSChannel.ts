export interface DTOAccountFollowingAddByRSSChannel {
  account_id: number;
  feed_url: string;
  title: string | null;
  image_url: string | null;
  /** Present when Basic Auth is configured for this feed. For display only; password is never returned. */
  basic_auth_username?: string | null;
}
