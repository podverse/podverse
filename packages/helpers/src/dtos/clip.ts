import { DTOAccount } from './account/account';
import { DTOItem } from './item/item';
import { DTOSharableStatus } from './sharableStatus';

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
