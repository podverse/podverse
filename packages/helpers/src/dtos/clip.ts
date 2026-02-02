import type { DTOAccount } from './account/account.js';
import type { DTOItem } from './item/item.js';
import type { DTOSharableStatus } from './sharableStatus.js';

export interface DTOClip {
  id: number;
  id_text: string;
  account: DTOAccount;
  item_id: string;
  item: DTOItem;
  start_time: string;
  end_time?: string | null;
  title?: string | null;
  description?: string | null;
  sharable_status: DTOSharableStatus;
}
