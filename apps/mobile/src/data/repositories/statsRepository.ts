import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import type { MobileAuthRequestContext } from './types';

/**
 * Listen-stats tracking (mirrors web `apps/web/src/utils/statsTracking/statsTracking.ts`). Stats
 * POSTs are idempotent server-side (one row per viewer per entity) and are fire-and-forget: a
 * failure must never block playback. The orchestrator fires these only when the playback-core
 * decision sets `shouldRecordPlaybackStat` (encodes the music/podcast/session-restore rules) and the
 * account allows listen stats. Screens never call these directly.
 */
export type PlaybackStatsTargets = {
  channelIdText: string | null;
  clipIdText: string | null;
  itemIdText: string | null;
};

const fireAndForget = (promise: Promise<unknown>): void => {
  void promise.catch(() => {
    // Stats are best-effort; swallow failures so playback is never blocked.
  });
};

export const statsRepository = {
  trackPlaybackStats: (context: MobileAuthRequestContext, targets: PlaybackStatsTargets): void => {
    if (targets.channelIdText !== null) {
      const channelIdText = targets.channelIdText;
      fireAndForget(
        requestWithMobileAuthRefresh(context, async (api) =>
          api.reqStatsTrackChannel(channelIdText)
        )
      );
    }
    if (targets.clipIdText !== null) {
      const clipIdText = targets.clipIdText;
      fireAndForget(
        requestWithMobileAuthRefresh(context, async (api) => api.reqStatsTrackClip(clipIdText))
      );
    }
    if (targets.itemIdText !== null) {
      const itemIdText = targets.itemIdText;
      fireAndForget(
        requestWithMobileAuthRefresh(context, async (api) => api.reqStatsTrackItem(itemIdText))
      );
    }
  },
};
