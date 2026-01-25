import { DTOItemValueRecipient } from './itemValueRecipient';

export interface DTOItemValue {
  id: number;
  item_id: number;
  type: string;
  method: string;
  suggested?: number | null;
  item_value_recipients: DTOItemValueRecipient[];
}
