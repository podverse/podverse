import { AccountSettingsListenStatsService } from '@podverse/orm';

export class ListenStatsOptedOutError extends Error {
  constructor() {
    super('Listen stats tracking is disabled for this account');
    this.name = 'ListenStatsOptedOutError';
  }
}

export async function assertListenStatsAllowed(accountId: number): Promise<void> {
  const service = new AccountSettingsListenStatsService();
  const allowListenStats = await service.getAllowListenStats(accountId);

  if (!allowListenStats) {
    throw new ListenStatsOptedOutError();
  }
}
