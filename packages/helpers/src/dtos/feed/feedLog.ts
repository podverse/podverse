export interface DTOFeedLog {
  id: number;
  feed_id: number;
  last_http_status: number | null;
  last_good_http_status_time: string | null;
  last_finished_parse_time: string | null;
  last_failed_parse_time: string | null;
  parse_errors: number;
}
