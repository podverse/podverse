export { getDb, getSqlite, initializeDatabase, schema } from './db';
export type { AppDatabase } from './db';

export {
  projectDownloadsIndexToNativeCache,
  projectLibraryBrowseIndexToNativeCache,
  projectQueueSnapshotToNativeCache,
} from './nativeCache';
export type {
  DownloadsIndexProjection,
  LibraryBrowseIndexProjection,
  QueueSnapshotProjection,
} from './nativeCache';

export {
  accountRepository,
  addByRssRepository,
  autoQueueRepository,
  exampleRepository,
  playbackContentRepository,
  queueRepository,
  segmentsRepository,
  selectPrimaryQueue,
  statsRepository,
} from './repositories';
export type {
  ExampleSnapshot,
  MobileAuthRequestContext,
  MoveNowPlayingToHistoryTarget,
  PlaybackStatsTargets,
} from './repositories';

export {
  isWatermarkStale,
  readSyncWatermark,
  readThrough,
  writeBehind,
  writeSyncWatermark,
} from './sync';
export type { ReadThroughOptions, WriteBehindOptions } from './sync';
