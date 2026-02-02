import type { DTOItem } from './item.js';

export interface DTOItemChaptersFeed {
  id: number;
  item_id: number;
  url: string;
  type: string;
  item?: DTOItem | null;
}
