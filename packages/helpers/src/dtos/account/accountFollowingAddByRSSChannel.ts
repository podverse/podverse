export interface DTOAccountFollowingAddByRSSChannel {
  account_id: number;
  feed_url: string;
  title: string | null;
  image_url: string | null;
  /**
   * The feed needs Basic Auth. Credentials are never returned or stored server-side; devices hold
   * them and send them with each parse or chapters request.
   */
  requires_credentials?: boolean;
}
