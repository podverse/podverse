import type { DTOAccount } from '../account/account.js';

export interface DTOStatsTrackAccountGuid {
  id: number;
  account: DTOAccount;
  account_guid: string;
  updated_at: string;
}
