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

const postPlaybackStats = async (
  context: MobileAuthRequestContext,
  targets: PlaybackStatsTargets
): Promise<void> => {
  if (targets.channelIdText !== null) {
    const channelIdText = targets.channelIdText;
    await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqStatsTrackChannel(channelIdText)
    );
  }
  if (targets.clipIdText !== null) {
    const clipIdText = targets.clipIdText;
    await requestWithMobileAuthRefresh(context, async (api) => api.reqStatsTrackClip(clipIdText));
  }
  if (targets.itemIdText !== null) {
    const itemIdText = targets.itemIdText;
    await requestWithMobileAuthRefresh(context, async (api) => api.reqStatsTrackItem(itemIdText));
  }
};

export const statsRepository = {
  trackPlaybackStats: (context: MobileAuthRequestContext, targets: PlaybackStatsTargets): void => {
    fireAndForget(postPlaybackStats(context, targets));
  },

  /**
   * Stats buffered while offline, sent as part of the playback outbox drain. Awaited so the drain
   * sends them in order instead of firing a burst, but a failure resolves: the account may not be
   * entitled to listen stats at all (the server answers 403), and a rejection here would abandon the
   * drain with the listens already accepted, leaving the outbox to retry the same doomed call
   * forever.
   */
  replayPlaybackStats: async (
    context: MobileAuthRequestContext,
    targets: PlaybackStatsTargets
  ): Promise<void> => {
    try {
      await postPlaybackStats(context, targets);
    } catch {
      // Best-effort, exactly as when the same stat is recorded during live playback.
    }
  },
};
