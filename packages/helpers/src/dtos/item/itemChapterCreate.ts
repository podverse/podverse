export interface DTOItemChapterCreate {
  data_hash: string;
  start_time: string;
  end_time: string | null;
  title: string | null;
  img: string | null;
  web_url: string | null;
  table_of_contents: boolean;
}
