import { config } from '@api/config/index.js';

import { AccountSettingsListenStatsService } from '@podverse/orm';

export class ListenStatsOptedOutError extends Error {
  constructor() {
    super('Listen stats tracking is disabled for this account');
    this.name = 'ListenStatsOptedOutError';
  }
}

export async function assertListenStatsAllowed(accountId: number): Promise<void> {
  const service = new AccountSettingsListenStatsService();
  const allowListenStats = await service.isListenStatsAllowed(
    accountId,
    config.popularityTracking.version
  );

  if (!allowListenStats) {
    throw new ListenStatsOptedOutError();
  }
}
