export interface DTOChannelTrailer {
  id: number;
  channel_id: number;
  title: string | null;
  url: string | null;
  pub_date: string;
  length: number | null;
  type: string | null;
  channel_season_id: number | null;
}
