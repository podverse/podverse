import type { DTOItemValueRecipient } from './itemValueRecipient.js';

export interface DTOItemValue {
  id: number;
  item_id: number;
  type: string;
  method: string;
  suggested?: number | null;
  item_value_recipients: DTOItemValueRecipient[];
}
