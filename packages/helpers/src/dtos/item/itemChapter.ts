import { DTOItemChaptersFeed } from './itemChaptersFeed';

export interface DTOItemChapter {
  id: number;
  id_text: string;
  item_chapters_feed_id: number;
  data_hash: string;
  start_time: string;
  end_time?: string | null;
  title?: string | null;
  img?: string | null;
  web_url?: string | null;
  table_of_contents: boolean;
  item_chapters_feed?: DTOItemChaptersFeed | null;
}
