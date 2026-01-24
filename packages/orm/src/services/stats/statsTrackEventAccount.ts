import { Account } from '@orm/entities/account/account';
import { BaseStatsTrackEventService } from './baseStatsTrackEvent';
import { StatsTrackEventAccount } from '@orm/entities/stats/statsTrackEventAccount';
import { AccountService } from '@orm/services/account/account';

export class StatsTrackEventAccountService extends BaseStatsTrackEventService<StatsTrackEventAccount> {
  protected entity = StatsTrackEventAccount;
  protected entityName = 'stats_track_event_account';
  protected entityIdField = 'tracked_account_id';
  protected entityIdTextField = 'account_id_text';
  private accountService: AccountService;

  constructor() {
    super();
    this.accountService = new AccountService();
  }

  protected async getEntityByIdText(id_text: string): Promise<Account | null | undefined> {
    return this.accountService.getByIdText(id_text);
  }
}