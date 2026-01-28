import { StatsAggregatedChannelService, StatsTrackEventChannelService } from '@podverse/orm';
import { CommandLineArgs } from '@workers/commands';
import { timerManager } from '@workers/factories/timerManager';

export const statsUpdateAggregatedRolling = async (args: CommandLineArgs) => {
  const timerFullRunLabel = 'statsUpdateAggregatedRolling full run';
  timerManager.start(timerFullRunLabel);

  const shouldUpdateHistoricalDaily = 'hd' in args;
  const shouldUpdateHistoricalWeekly = 'hw' in args;
  const shouldUpdateHistoricalMonthly = 'hm' in args;

  const shouldUpdateHistoricalOptions = {
    daily: shouldUpdateHistoricalDaily,
    weekly: shouldUpdateHistoricalWeekly,
    monthly: shouldUpdateHistoricalMonthly,
  };

  const statsAggregatedChannelService = new StatsAggregatedChannelService();
  const statsTrackEventChannelService = new StatsTrackEventChannelService();
  const limit = 500;

  const timerLabel = 'Channel track events - get top channels';
  timerManager.start(timerLabel);
  const channelsToUpdate = await statsTrackEventChannelService._getTopEntitiesByEventCount(limit);
  timerManager.end(timerLabel);

  const timerLabel2 = 'Channel track events - update aggregated stats';
  timerManager.start(timerLabel2);
  for (const channelId of channelsToUpdate) {
    const channelTimerLabel = `Channel ${channelId} update`;
    timerManager.start(channelTimerLabel);
    await statsAggregatedChannelService.updateAggregatedStatsRolling(
      channelId,
      shouldUpdateHistoricalOptions
    );
    timerManager.end(channelTimerLabel);
  }
  timerManager.end(timerLabel2);

  // TODO: add other stats table updates
  // TODO: delete old ones

  timerManager.end(timerFullRunLabel);
};
