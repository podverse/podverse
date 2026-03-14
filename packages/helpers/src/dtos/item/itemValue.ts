import type { DTOValueMetaBoost } from '../valueMetaBoost.js';
import type { DTOItemValueRecipient } from './itemValueRecipient.js';

export interface DTOItemValue {
  id: number;
  item_id: number;
  type: string;
  method: string;
  suggested?: number | null;
  meta_boost?: DTOValueMetaBoost | null;
  item_value_recipients: DTOItemValueRecipient[];
}
