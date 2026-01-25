import { TIME_CONSTANTS } from '@podverse/helpers';
import { StatsAggregatedChannelService, StatsAggregatedAccountService, StatsAggregatedClipService, StatsAggregatedItemService, StatsAggregatedPlaylistService, StatsTrackEventAccountService, StatsTrackEventChannelService, StatsTrackEventClipService, StatsTrackEventItemService, StatsTrackEventPlaylistService } from '@podverse/orm';
import { CommandLineArgs } from '@workers/commands';
import { timerManager } from '@workers/factories/timerManager';

const limit = 500;

const updateStats = async (
  entityName: string,
  getTopEntities: (limit: number) => Promise<number[]>,
  updateAggregatedStats: (id: number, shouldUpdateAllTime: boolean) => Promise<void>,
  deleteOldEvents: (time: number) => Promise<void>,
  shouldUpdateAllTime: boolean,
) => {
  const timerLabelGet = `${entityName} track events - get top ${entityName}s`;
  timerManager.start(timerLabelGet);
  const entitiesToUpdate = await getTopEntities(limit);
  timerManager.end(timerLabelGet);

  const timerLabelAggregated = `${entityName} track events - update aggregated stats`;
  timerManager.start(timerLabelAggregated);
  for (const entityId of entitiesToUpdate) {
    const entityTimerLabel = `${entityName} ${entityId} update`;
    timerManager.start(entityTimerLabel);
    await updateAggregatedStats(entityId, shouldUpdateAllTime);
    timerManager.end(entityTimerLabel);
  }
  timerManager.end(timerLabelAggregated);

  await deleteOldEvents(TIME_CONSTANTS.ONE_MONTH_IN_MINUTES);
};

export const statsUpdateAggregated = async (args: CommandLineArgs) => {
  const timerFullRunLabel = 'statsUpdateAggregated full run';
  timerManager.start(timerFullRunLabel);

  const shouldUpdateAllTime = 'at' in args;

  await updateStats(
    'Account',
    new StatsTrackEventAccountService()._getTopEntitiesByEventCount.bind(new StatsTrackEventAccountService()),
    new StatsAggregatedAccountService().updateAggregatedStats.bind(new StatsAggregatedAccountService()),
    new StatsTrackEventAccountService()._deleteOldEvents.bind(new StatsTrackEventAccountService()),
    shouldUpdateAllTime,
  );

  await updateStats(
    'Channel',
    new StatsTrackEventChannelService()._getTopEntitiesByEventCount.bind(new StatsTrackEventChannelService()),
    new StatsAggregatedChannelService().updateAggregatedStats.bind(new StatsAggregatedChannelService()),
    new StatsTrackEventChannelService()._deleteOldEvents.bind(new StatsTrackEventChannelService()),
    shouldUpdateAllTime,
  );

  await updateStats(
    'Clip',
    new StatsTrackEventClipService()._getTopEntitiesByEventCount.bind(new StatsTrackEventClipService()),
    new StatsAggregatedClipService().updateAggregatedStats.bind(new StatsAggregatedClipService()),
    new StatsTrackEventClipService()._deleteOldEvents.bind(new StatsTrackEventClipService()),
    shouldUpdateAllTime,
  );

  await updateStats(
    'Item',
    new StatsTrackEventItemService()._getTopEntitiesByEventCount.bind(new StatsTrackEventItemService()),
    new StatsAggregatedItemService().updateAggregatedStats.bind(new StatsAggregatedItemService()),
    new StatsTrackEventItemService()._deleteOldEvents.bind(new StatsTrackEventItemService()),
    shouldUpdateAllTime,
  );

  await updateStats(
    'Playlist',
    new StatsTrackEventPlaylistService()._getTopEntitiesByEventCount.bind(new StatsTrackEventPlaylistService()),
    new StatsAggregatedPlaylistService().updateAggregatedStats.bind(new StatsAggregatedPlaylistService()),
    new StatsTrackEventPlaylistService()._deleteOldEvents.bind(new StatsTrackEventPlaylistService()),
    shouldUpdateAllTime,
  );

  timerManager.end(timerFullRunLabel);
};

