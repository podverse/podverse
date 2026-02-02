import type { DTOItem } from './item.js';

export interface DTOItemSoundbite {
  id: number;
  id_text: string;
  item_id: number;
  start_time: string;
  duration: string;
  title?: string | null;
  item?: DTOItem | null;
}
