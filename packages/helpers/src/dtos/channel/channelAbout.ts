export interface DTOChannelAbout {
  id: number;
  channel_id: number;
  author: string | null;
  episode_count: number | null;
  explicit: boolean | null;
  itunes_type: string | null;
  language: string | null;
  last_pub_date: string | null;
  website_link_url: string | null;
}
