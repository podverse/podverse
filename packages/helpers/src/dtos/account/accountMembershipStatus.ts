export interface DTOAccountMembershipStatus {
  id: number;
  account_id: number;
  account_membership_id: number;
  membership_expires_at: string | null;
  auto_renew: boolean;
  allow_directory_add_by_rss: boolean | null;
  max_add_by_rss_feeds: number | null;
  max_manual_refreshes_per_hour: number | null;
  track_stats: boolean | null;
  allow_notifications: boolean | null;
}
