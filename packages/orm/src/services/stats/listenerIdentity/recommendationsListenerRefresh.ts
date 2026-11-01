import { AppDataSourceReadWrite } from '@orm/db/index.js';
import { loggerService } from '@orm/factories/loggerService.js';
import { replaceRecommendationsForListeners } from '@orm/services/stats/recommendationsRefresh.js';

/**
 * Rebuilds one listener's stored recommendations from current show similarity. Call after a
 * taste write that changes the 1–5 weight seeds (new show, weight step, override, or remove).
 * Failures are logged and never fail the taste write that triggered them.
 */
export async function refreshRecommendationsForListener(listenerId: string): Promise<void> {
  try {
    await AppDataSourceReadWrite.transaction(async (manager) => {
      await replaceRecommendationsForListeners(manager, [listenerId]);
    });
  } catch (error) {
    loggerService.error('Failed to refresh recommendations for listener', { error });
  }
}
