import type { DTOChannelValueRecipient } from './channelValueRecipient.js';

export interface DTOChannelValue {
  id: number;
  type: string;
  method: string;
  suggested: number | null;
  channel_value_recipients: DTOChannelValueRecipient[];
}
