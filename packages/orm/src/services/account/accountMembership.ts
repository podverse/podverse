import { AccountMembership } from '@orm/entities/account/accountMembership.js';
import { BaseGetOnlyService } from '../base/baseGetOnlyService.js';

export class AccountMembershipService extends BaseGetOnlyService<AccountMembership> {
  constructor() {
    super(AccountMembership);
  }
}
