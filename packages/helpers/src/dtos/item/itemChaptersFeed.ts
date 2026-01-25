import { DTOItem } from './item';

export interface DTOItemChaptersFeed {
  id: number;
  item_id: number;
  url: string;
  type: string;
  item?: DTOItem | null;
}
