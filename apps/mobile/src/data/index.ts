export { getDb, getSqlite, initializeDatabase, schema } from './db';
export type { AppDatabase } from './db';

export {
  buildDownloadsIndexPayload,
  buildLibraryBrowseIndexPayload,
  buildQueueSnapshotPayload,
  NATIVE_CACHE_SCHEMA_VERSION,
  projectDownloadsIndexToNativeCache,
  projectLibraryBrowseIndexToNativeCache,
  projectQueueSnapshotToNativeCache,
} from './nativeCache';
export type {
  DownloadsIndexCachePayload,
  DownloadsIndexProjection,
  LibraryBrowseIndexCachePayload,
  LibraryBrowseIndexProjection,
  NativeCacheSchemaVersion,
  QueueSnapshotCachePayload,
  QueueSnapshotProjection,
} from './nativeCache';

export {
  accountRepository,
  addByRssRepository,
  autoQueueRepository,
  downloadsRepository,
  exampleRepository,
  playbackContentRepository,
  playbackOutboxRepository,
  queueRepository,
  segmentsRepository,
  selectPrimaryQueue,
  statsRepository,
} from './repositories';
export type {
  ExampleSnapshot,
  PlaybackLocalStateRecord,
  PlaybackOutboxDrainResult,
  PlaybackOutboxReconcileResult,
  PlaybackOutboxEnqueueEvent,
  PlaybackOutboxResourceKind,
  MobileAuthRequestContext,
  MoveNowPlayingToHistoryTarget,
  PlaybackStatsTargets,
} from './repositories';
export {
  eventKindEmitsRemovalTombstone,
  isPositionOnlyPlaybackEvent,
  PLAYBACK_OUTBOX_RESOURCE_KINDS,
  PLAYBACK_POSITION_ONLY_EVENT_KINDS,
  selectPlaybackOutboxEvictions,
  shouldCollapsePlaybackEvent,
  shouldCollapseQueueReorderEvent,
  shouldEnqueuePlaybackEvent,
  toReplayOccurredAtIso,
} from './repositories';

export {
  isWatermarkStale,
  readPlaybackClockOffsetMs,
  readSyncWatermark,
  readThrough,
  writeBehind,
  writePlaybackClockOffsetMs,
  writeSyncWatermark,
} from './sync';
export type { PlaybackClockOffsetSnapshot, ReadThroughOptions, WriteBehindOptions } from './sync';
