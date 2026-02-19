import type { DTOChannelValueRecipient } from './channelValueRecipient.js';
import type { DTOValueMetaBoost } from '../valueMetaBoost.js';

export interface DTOChannelValue {
  id: number;
  type: string;
  method: string;
  suggested: number | null;
  meta_boost?: DTOValueMetaBoost | null;
  channel_value_recipients: DTOChannelValueRecipient[];
}
