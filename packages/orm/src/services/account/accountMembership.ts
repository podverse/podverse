import { AccountMembership } from '@orm/entities/account/accountMembership';
import { BaseGetOnlyService } from '../base/baseGetOnlyService';

export class AccountMembershipService extends BaseGetOnlyService<AccountMembership> {
  constructor() {
    super(AccountMembership);
  }
}
