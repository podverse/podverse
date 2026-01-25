import { DTOAccount } from '../account/account';

export interface DTOStatsTrackAccountGuid {
  id: number;
  account: DTOAccount;
  account_guid: string;
  updated_at: string;
}
