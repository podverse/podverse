import { getLogger } from '@workers/factories/logger.js';
import { Client } from 'pg';

import {
  buildV4MigrationFeedRetryDedupeKey,
  getV4MigrationFeedSettledByFeedId,
  isValidNanoIdV2IdText,
} from '@podverse/orm';

import type { LocalCatalog, V4PodcastKey } from '../v4Library/copyAccountLibraryLib.js';
import { PODCAST_SQL } from './seedAccountCatalog.js';
import type { CatalogSeedCreate } from './seedAccountCatalogLib.js';
import {
  assertLocalDatabase,
  emptyCatalog,
  ensureChannel,
  flag,
  integerOrNull,
  queryV4,
  queryV5,
  queueParses,
  readExistingShows,
  readLocalChannels,
  refusalForExisting,
  scheduleRetries,
  textOrNull,
  uniqueTexts,
} from './seedCatalogApply.js';
import type {
  StageCatalogClassification,
  StageCatalogShow,
  StageCatalogSource,
  StageFeedParseState,
  StageSettledParseCounts,
} from './seedStageCatalogLib.js';
import {
  classifyStageCatalog,
  countSettledParses,
  refusalForDuplicateCreates,
  stageChannelTakesFirstParse,
  stageShowNeedsFirstParse,
} from './seedStageCatalogLib.js';

export type V4CatalogStage = 'pilot' | 'sample' | 'full';

export type V4SeedStageCatalogInput = {
  stage: V4CatalogStage;
  /** Pilot and sample: v4 users.id values. Full ignores this array. */
  v4Ids: readonly string[];
  dryRun: boolean;
  onProgress?: (progress: V4SeedStageCatalogProgress) => void;
};

export type V4SeedStageCatalogProgress = {
  created: number;
  queued: number;
  settled: number;
  failedParse: number;
  waiting: number;
  elapsedMs: number;
};

export type V4SeedStageCatalogResult = {
  stage: V4CatalogStage;
  subscribed: number;
  viewedNotSubscribed: number;
  libraryOnly: number;
  alreadyLocal: number;
  missing: number;
  nonPublic: number;
  spam: number;
  takedown: number;
  noPodcastIndexId: number;
  skippedNoAuthorityUrl: number;
  skippedInvalidId: number;
  /** Shows `classifyStageCatalog` put in `creates`. Same on a dry run and an apply. */
  toEnsure: number;
  created: number;
  queued: number;
  settled: number;
  failedParse: number;
  /** v4 podcast ids whose feed settled with no finished parse. Sorted ascending. */
  failedPodcastIds: string[];
  elapsedMs: number;
};

const STAGE_CATALOG_QUERY_CHUNK = 2000;
const STAGE_CATALOG_PROGRESS_EVERY = 100;
const STAGE_CATALOG_POLL_MS = 60000;

const SUBSCRIBED_SQL_SCOPED = `
SELECT DISTINCT btrim(pid) AS id
FROM users u, unnest(u."subscribedPodcastIds") AS pid
WHERE u.id = ANY($1::varchar[])
  AND btrim(pid) <> ''
`;

const SUBSCRIBED_SQL_ALL = `
SELECT DISTINCT btrim(pid) AS id
FROM users u, unnest(u."subscribedPodcastIds") AS pid
WHERE btrim(pid) <> ''
`;

const VIEWED_SQL = `
SELECT DISTINCT s.podcast_id AS id
FROM stats_podcast s
WHERE s.play_count > 0
  AND s.podcast_id IS NOT NULL
`;

const LIBRARY_BRANCHES: readonly { owner: string; sql: string }[] = [
  {
    owner: 'mr',
    sql: `
SELECT e."podcastId" AS id
FROM "mediaRefs" mr
INNER JOIN episodes e ON e.id = mr."episodeId"
WHERE mr."isOfficialChapter" IS NOT TRUE
  AND mr."isOfficialSoundBite" IS NOT TRUE
  AND e."podcastId" IS NOT NULL`,
  },
  {
    owner: 'p',
    sql: `
SELECT e."podcastId" AS id
FROM playlists p
INNER JOIN playlists_episodes_episodes pe ON pe."playlistsId" = p.id
INNER JOIN episodes e ON e.id = pe."episodesId"
WHERE e."podcastId" IS NOT NULL`,
  },
  {
    owner: 'p',
    sql: `
SELECT e."podcastId" AS id
FROM playlists p
INNER JOIN playlists_media_refs_media_refs pm ON pm."playlistsId" = p.id
INNER JOIN "mediaRefs" mr ON mr.id = pm."mediaRefsId"
INNER JOIN episodes e ON e.id = mr."episodeId"
WHERE e."podcastId" IS NOT NULL`,
  },
  {
    owner: 'h',
    sql: `
SELECT e."podcastId" AS id
FROM "userHistoryItems" h
INNER JOIN episodes e ON e.id = h."episodeId"
WHERE h."episodeId" IS NOT NULL
  AND e."podcastId" IS NOT NULL`,
  },
  {
    owner: 'h',
    sql: `
SELECT e."podcastId" AS id
FROM "userHistoryItems" h
INNER JOIN "mediaRefs" mr ON mr.id = h."mediaRefId"
INNER JOIN episodes e ON e.id = mr."episodeId"
WHERE h."mediaRefId" IS NOT NULL
  AND e."podcastId" IS NOT NULL`,
  },
  {
    owner: 'q',
    sql: `
SELECT e."podcastId" AS id
FROM "userQueueItems" q
INNER JOIN episodes e ON e.id = q."episodeId"
WHERE q."episodeId" IS NOT NULL
  AND e."podcastId" IS NOT NULL`,
  },
  {
    owner: 'q',
    sql: `
SELECT e."podcastId" AS id
FROM "userQueueItems" q
INNER JOIN "mediaRefs" mr ON mr.id = q."mediaRefId"
INNER JOIN episodes e ON e.id = mr."episodeId"
WHERE q."mediaRefId" IS NOT NULL
  AND e."podcastId" IS NOT NULL`,
  },
  {
    owner: 'n',
    sql: `
SELECT e."podcastId" AS id
FROM "userNowPlayingItems" n
INNER JOIN episodes e ON e.id = n."episodeId"
WHERE n."episodeId" IS NOT NULL
  AND e."podcastId" IS NOT NULL`,
  },
  {
    owner: 'n',
    sql: `
SELECT e."podcastId" AS id
FROM "userNowPlayingItems" n
INNER JOIN "mediaRefs" mr ON mr.id = n."mediaRefId"
INNER JOIN episodes e ON e.id = mr."episodeId"
WHERE n."mediaRefId" IS NOT NULL
  AND e."podcastId" IS NOT NULL`,
  },
];

const FEED_PARSE_SQL = `
SELECT f.id AS feed_id,
       f.is_parsing,
       fl.last_finished_parse_time,
       fl.last_failed_parse_time
FROM feed f
LEFT JOIN feed_log fl ON fl.feed_id = f.id
WHERE f.id = ANY($1::int[])
`;

const CHANNEL_FEED_SQL = `
SELECT id_text, feed_id
FROM channel
WHERE id_text = ANY($1::varchar[])
`;

const DEDUPE_KEY_SQL = `
SELECT dedupe_key
FROM scheduled_job
WHERE dedupe_key = ANY($1::varchar[])
`;

type ApplyCounts = {
  created: number;
  queued: number;
  settled: number;
  failedParse: number;
  failedPodcastIds: string[];
};

type ProgressCounts = {
  created: number;
  queued: number;
  settled: number;
  failedParse: number;
  waiting: number;
};

type WaitFeed = {
  feedId: number;
  settled: boolean;
  lastFinishedParseTime: Date | null;
};

type QueueShow = {
  podcastIndexId: number;
  authorityUrl: string | null;
};

function chunkValues<T>(values: readonly T[], size: number): T[][] {
  const slices: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    slices.push(values.slice(index, index + size));
  }
  return slices;
}

function compareText(left: string, right: string): number {
  if (left < right) {
    return -1;
  }
  if (left > right) {
    return 1;
  }
  return 0;
}

function librarySql(scoped: boolean): string {
  return LIBRARY_BRANCHES.map((branch) => {
    if (!scoped) {
      return branch.sql;
    }
    return `${branch.sql}\n  AND ${branch.owner}."ownerId" = ANY($1::varchar[])`;
  }).join('\nUNION\n');
}

function dateOrNull(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  const parsed = new Date(trimmed);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function assertStageIds(stage: V4CatalogStage, v4Ids: readonly string[]): void {
  if (stage === 'full') {
    return;
  }
  if (v4Ids.length === 0) {
    throw new Error('Missing account ids for this stage.');
  }
  for (const v4Id of v4Ids) {
    if (!isValidNanoIdV2IdText(v4Id)) {
      throw new Error('v4 id must be 7–15 characters.');
    }
  }
}

function throwIfRefusal(refusal: string | null): void {
  if (refusal !== null) {
    throw new Error(refusal);
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function emitProgress(
  onProgress: V4SeedStageCatalogInput['onProgress'],
  startedAt: number,
  counts: ProgressCounts
): void {
  if (onProgress === undefined) {
    return;
  }
  onProgress({
    created: counts.created,
    queued: counts.queued,
    settled: counts.settled,
    failedParse: counts.failedParse,
    waiting: counts.waiting,
    elapsedMs: Date.now() - startedAt,
  });
}

function addAll(into: Set<string>, from: ReadonlySet<string>): void {
  for (const value of from) {
    into.add(value);
  }
}

function keepFirst<K, V>(into: Map<K, V>, from: ReadonlyMap<K, V>): void {
  for (const [key, value] of from) {
    if (!into.has(key)) {
      into.set(key, value);
    }
  }
}

function keepFirstSet(
  into: Map<string, Set<string>>,
  from: ReadonlyMap<string, ReadonlySet<string>>
): void {
  for (const [key, value] of from) {
    if (!into.has(key)) {
      into.set(key, new Set(value));
    }
  }
}

function mergeLocalCatalogs(parts: readonly LocalCatalog[]): LocalCatalog {
  const merged = emptyCatalog();
  for (const part of parts) {
    addAll(merged.channelIdTexts, part.channelIdTexts);
    keepFirst(merged.channelByPodcastIndexId, part.channelByPodcastIndexId);
    keepFirst(merged.channelByFeedUrl, part.channelByFeedUrl);
    keepFirst(merged.channelByPodcastGuid, part.channelByPodcastGuid);
    keepFirst(merged.absorbSurvivorByPodcastIndexId, part.absorbSurvivorByPodcastIndexId);
    addAll(merged.itemIdTexts, part.itemIdTexts);
    keepFirstSet(merged.itemGuidsByChannel, part.itemGuidsByChannel);
    keepFirstSet(merged.itemEnclosuresByChannel, part.itemEnclosuresByChannel);
    keepFirstSet(merged.itemTitlePubByChannel, part.itemTitlePubByChannel);
    addAll(merged.clipIdTexts, part.clipIdTexts);
    addAll(merged.playlistIdTexts, part.playlistIdTexts);
    addAll(merged.accountIdTexts, part.accountIdTexts);
    addAll(merged.feedUrls, part.feedUrls);
    addAll(merged.attemptedChannelIdTexts, part.attemptedChannelIdTexts);
    addAll(merged.settledChannelIdTexts, part.settledChannelIdTexts);
  }
  return merged;
}

async function readStageChannels(podcasts: readonly V4PodcastKey[]): Promise<LocalCatalog> {
  if (podcasts.length === 0) {
    return emptyCatalog();
  }
  const parts: LocalCatalog[] = [];
  for (const slice of chunkValues(podcasts, STAGE_CATALOG_QUERY_CHUNK)) {
    parts.push(await readLocalChannels(slice));
  }
  return mergeLocalCatalogs(parts);
}

async function readIds(client: Client, sql: string, values: readonly unknown[]): Promise<string[]> {
  const rows = await queryV4(client, sql, values);
  return uniqueTexts(rows.map((row) => textOrNull(row.id)));
}

function podcastKeyFromRow(row: Record<string, unknown>): V4PodcastKey | null {
  const id = textOrNull(row.id);
  if (id === null) {
    return null;
  }
  return {
    id,
    podcastIndexId: textOrNull(row.podcast_index_id),
    podcastGuid: textOrNull(row.podcast_guid),
    authorityUrl: textOrNull(row.authority_url),
    isPublic: flag(row.is_public),
    flagStatus: textOrNull(row.flag_status),
  };
}

async function readPodcastKeys(
  client: Client,
  ids: readonly string[]
): Promise<Map<string, V4PodcastKey>> {
  const byId = new Map<string, V4PodcastKey>();
  for (const slice of chunkValues(ids, STAGE_CATALOG_QUERY_CHUNK)) {
    const rows = await queryV4(client, PODCAST_SQL, [slice]);
    for (const row of rows) {
      const key = podcastKeyFromRow(row);
      if (key === null || byId.has(key.id)) {
        continue;
      }
      byId.set(key.id, key);
    }
  }
  return byId;
}

function tagShows(
  subscribedIds: readonly string[],
  viewedIds: readonly string[],
  libraryIds: readonly string[],
  podcastById: ReadonlyMap<string, V4PodcastKey>
): StageCatalogShow[] {
  const subscribed = new Set(subscribedIds);
  const viewed = new Set(viewedIds);
  const library = new Set(libraryIds);
  const shows: StageCatalogShow[] = [];
  for (const id of uniqueTexts([...subscribedIds, ...viewedIds, ...libraryIds])) {
    const sources: StageCatalogSource[] = [];
    if (subscribed.has(id)) {
      sources.push('subscribed');
    }
    if (viewed.has(id)) {
      sources.push('viewed');
    }
    if (library.has(id)) {
      sources.push('library');
    }
    const podcast = podcastById.get(id);
    shows.push({
      id,
      sources,
      podcast: podcast === undefined ? null : podcast,
    });
  }
  return shows;
}

async function readStageShows(
  connectionString: string,
  stage: V4CatalogStage,
  v4Ids: readonly string[]
): Promise<StageCatalogShow[]> {
  const client = new Client({ connectionString });
  const scoped = stage !== 'full';
  const values = scoped ? [v4Ids] : [];
  try {
    await client.connect();
    const subscribed = await readIds(
      client,
      scoped ? SUBSCRIBED_SQL_SCOPED : SUBSCRIBED_SQL_ALL,
      values
    );
    const viewed = stage === 'full' ? await readIds(client, VIEWED_SQL, []) : [];
    const library = await readIds(client, librarySql(scoped), values);
    const podcastById = await readPodcastKeys(
      client,
      uniqueTexts([...subscribed, ...viewed, ...library])
    );
    return tagShows(subscribed, viewed, library, podcastById);
  } catch (error) {
    throw new Error('Could not read the v4 catalog.', { cause: error });
  } finally {
    await client.end().catch(() => undefined);
  }
}

function rememberFeed(
  v4IdsByFeedId: Map<number, string[]>,
  channelIdByFeedId: Map<number, string>,
  feedId: number,
  v4Id: string,
  channelIdText: string
): void {
  const ids = v4IdsByFeedId.get(feedId);
  if (ids === undefined) {
    v4IdsByFeedId.set(feedId, [v4Id]);
  } else if (!ids.includes(v4Id)) {
    ids.push(v4Id);
  }
  if (!channelIdByFeedId.has(feedId)) {
    channelIdByFeedId.set(feedId, channelIdText);
  }
}

async function readFeedIdsByChannelId(channelIds: readonly string[]): Promise<Map<string, number>> {
  const feedIdByChannelId = new Map<string, number>();
  for (const slice of chunkValues(channelIds, STAGE_CATALOG_QUERY_CHUNK)) {
    const rows = await queryV5(CHANNEL_FEED_SQL, [slice]);
    for (const row of rows) {
      const idText = textOrNull(row.id_text);
      const feedId = integerOrNull(row.feed_id);
      if (idText !== null && feedId !== null && !feedIdByChannelId.has(idText)) {
        feedIdByChannelId.set(idText, feedId);
      }
    }
  }
  return feedIdByChannelId;
}

async function readFeedParseStates(
  feedIds: readonly number[]
): Promise<Map<number, StageFeedParseState>> {
  const byFeedId = new Map<number, StageFeedParseState>();
  for (const slice of chunkValues(feedIds, STAGE_CATALOG_QUERY_CHUNK)) {
    const rows = await queryV5(FEED_PARSE_SQL, [slice]);
    for (const row of rows) {
      const feedId = integerOrNull(row.feed_id);
      if (feedId === null || byFeedId.has(feedId)) {
        continue;
      }
      byFeedId.set(feedId, {
        isParsing: dateOrNull(row.is_parsing),
        lastFinishedParseTime: dateOrNull(row.last_finished_parse_time),
        lastFailedParseTime: dateOrNull(row.last_failed_parse_time),
      });
    }
  }
  return byFeedId;
}

async function readExistingDedupeKeys(keys: readonly string[]): Promise<Set<string>> {
  const found = new Set<string>();
  for (const slice of chunkValues(keys, STAGE_CATALOG_QUERY_CHUNK)) {
    const rows = await queryV5(DEDUPE_KEY_SQL, [slice]);
    for (const row of rows) {
      const key = textOrNull(row.dedupe_key);
      if (key !== null) {
        found.add(key);
      }
    }
  }
  return found;
}

async function readSettledByFeedId(feedIds: readonly number[]): Promise<Map<number, boolean>> {
  const settledByFeedId = new Map<number, boolean>();
  const slices = chunkValues(feedIds, STAGE_CATALOG_QUERY_CHUNK);
  if (slices.length === 0) {
    await getV4MigrationFeedSettledByFeedId([]);
    return settledByFeedId;
  }
  for (const slice of slices) {
    const part = await getV4MigrationFeedSettledByFeedId(slice);
    for (const [feedId, settled] of part) {
      if (!settledByFeedId.has(feedId)) {
        settledByFeedId.set(feedId, settled);
      }
    }
  }
  return settledByFeedId;
}

function queueShowById(classification: StageCatalogClassification): Map<string, QueueShow> {
  const byId = new Map<string, QueueShow>();
  for (const show of classification.creates) {
    byId.set(show.id, {
      podcastIndexId: show.podcastIndexId,
      authorityUrl: show.authorityUrl,
    });
  }
  for (const show of classification.alreadyLocalShows) {
    byId.set(show.id, {
      podcastIndexId: show.podcastIndexId,
      authorityUrl: show.authorityUrl,
    });
  }
  return byId;
}

function queueShowForFeed(
  channelIdText: string,
  v4Ids: readonly string[],
  showById: ReadonlyMap<string, QueueShow>
): CatalogSeedCreate | null {
  for (const v4Id of v4Ids) {
    if (!stageChannelTakesFirstParse(channelIdText, v4Id)) {
      continue;
    }
    const show = showById.get(v4Id);
    if (show === undefined || show.authorityUrl === null) {
      continue;
    }
    return {
      id: v4Id,
      podcastIndexId: show.podcastIndexId,
      authorityUrl: show.authorityUrl,
    };
  }
  return null;
}

function waitFeeds(
  feedIds: readonly number[],
  settledByFeedId: ReadonlyMap<number, boolean>,
  parseByFeedId: ReadonlyMap<number, StageFeedParseState>
): WaitFeed[] {
  return feedIds.map((feedId) => {
    const parse = parseByFeedId.get(feedId);
    return {
      feedId,
      settled: settledByFeedId.get(feedId) === true,
      lastFinishedParseTime: parse === undefined ? null : parse.lastFinishedParseTime,
    };
  });
}

function failedPodcastIdsFor(
  rows: readonly WaitFeed[],
  v4IdsByFeedId: ReadonlyMap<number, readonly string[]>
): string[] {
  const ids: string[] = [];
  for (const row of rows) {
    if (!row.settled || row.lastFinishedParseTime !== null) {
      continue;
    }
    const podcastIds = v4IdsByFeedId.get(row.feedId);
    if (podcastIds !== undefined) {
      ids.push(...podcastIds);
    }
  }
  ids.sort(compareText);
  return ids;
}

async function readWaitPass(
  feedIds: readonly number[],
  v4IdsByFeedId: ReadonlyMap<number, readonly string[]>
): Promise<{ counts: StageSettledParseCounts; failedPodcastIds: string[] }> {
  const settledByFeedId = await readSettledByFeedId(feedIds);
  const parseByFeedId = await readFeedParseStates(feedIds);
  const rows = waitFeeds(feedIds, settledByFeedId, parseByFeedId);
  return {
    counts: countSettledParses(rows),
    failedPodcastIds: failedPodcastIdsFor(rows, v4IdsByFeedId),
  };
}

async function mapAlreadyLocalFeeds(
  classification: StageCatalogClassification,
  v4IdsByFeedId: Map<number, string[]>,
  channelIdByFeedId: Map<number, string>
): Promise<void> {
  const v4IdsByChannelId = new Map<string, string[]>();
  for (const show of classification.alreadyLocalShows) {
    const list = v4IdsByChannelId.get(show.channelIdText);
    if (list === undefined) {
      v4IdsByChannelId.set(show.channelIdText, [show.id]);
    } else if (!list.includes(show.id)) {
      list.push(show.id);
    }
  }
  const feedIdByChannelId = await readFeedIdsByChannelId([...v4IdsByChannelId.keys()]);
  for (const [channelIdText, v4Ids] of v4IdsByChannelId) {
    const feedId = feedIdByChannelId.get(channelIdText);
    if (feedId === undefined) {
      continue;
    }
    for (const v4Id of v4Ids) {
      rememberFeed(v4IdsByFeedId, channelIdByFeedId, feedId, v4Id, channelIdText);
    }
  }
}

async function applyStage(
  classification: StageCatalogClassification,
  startedAt: number,
  onProgress: V4SeedStageCatalogInput['onProgress']
): Promise<ApplyCounts> {
  const creates = classification.creates;
  throwIfRefusal(refusalForDuplicateCreates(creates));
  for (const slice of chunkValues(creates, STAGE_CATALOG_QUERY_CHUNK)) {
    const existing = await readExistingShows(slice);
    throwIfRefusal(refusalForExisting(slice, existing));
  }

  const v4IdsByFeedId = new Map<number, string[]>();
  const channelIdByFeedId = new Map<number, string>();
  let created = 0;
  let ensured = 0;
  let lastProgressAt = Date.now();
  for (const show of creates) {
    const ensuredChannel = await ensureChannel(show);
    if (ensuredChannel.outcome === 'created') {
      created += 1;
    }
    rememberFeed(v4IdsByFeedId, channelIdByFeedId, ensuredChannel.feedId, show.id, show.id);
    ensured += 1;
    const dueByCount = ensured % STAGE_CATALOG_PROGRESS_EVERY === 0;
    const dueByTime = Date.now() - lastProgressAt >= STAGE_CATALOG_POLL_MS;
    if (dueByCount || dueByTime) {
      emitProgress(onProgress, startedAt, {
        created,
        queued: 0,
        settled: 0,
        failedParse: 0,
        waiting: v4IdsByFeedId.size,
      });
      lastProgressAt = Date.now();
    }
  }

  await mapAlreadyLocalFeeds(classification, v4IdsByFeedId, channelIdByFeedId);

  const feedIds = [...v4IdsByFeedId.keys()];
  const parseByFeedId = await readFeedParseStates(feedIds);
  const showById = queueShowById(classification);
  const toQueue: CatalogSeedCreate[] = [];
  const feedIdsToQueue: number[] = [];
  for (const feedId of feedIds) {
    const stored = parseByFeedId.get(feedId);
    const parse: StageFeedParseState = stored ?? {
      isParsing: null,
      lastFinishedParseTime: null,
      lastFailedParseTime: null,
    };
    if (!stageShowNeedsFirstParse(parse)) {
      continue;
    }
    const channelIdText = channelIdByFeedId.get(feedId);
    const v4Ids = v4IdsByFeedId.get(feedId);
    if (channelIdText === undefined || v4Ids === undefined) {
      continue;
    }
    const queuedShow = queueShowForFeed(channelIdText, v4Ids, showById);
    if (queuedShow === null) {
      continue;
    }
    toQueue.push(queuedShow);
    feedIdsToQueue.push(feedId);
  }

  const existingKeys = await readExistingDedupeKeys(
    feedIdsToQueue.map((feedId) => buildV4MigrationFeedRetryDedupeKey(feedId))
  );
  const retryFeedIds = feedIdsToQueue.filter(
    (feedId) => !existingKeys.has(buildV4MigrationFeedRetryDedupeKey(feedId))
  );
  await scheduleRetries(retryFeedIds);
  await queueParses(toQueue);
  const queued = toQueue.length;

  let settled: number;
  let failedParse: number;
  let failedPodcastIds: string[];
  let firstPass = true;
  while (true) {
    const pass = await readWaitPass(feedIds, v4IdsByFeedId);
    settled = pass.counts.settled;
    failedParse = pass.counts.failedParse;
    failedPodcastIds = pass.failedPodcastIds;
    const done = pass.counts.waiting === 0;
    const due = Date.now() - lastProgressAt >= STAGE_CATALOG_POLL_MS;
    if (firstPass || due || done) {
      emitProgress(onProgress, startedAt, {
        created,
        queued,
        settled,
        failedParse,
        waiting: pass.counts.waiting,
      });
      lastProgressAt = Date.now();
    }
    firstPass = false;
    if (done) {
      break;
    }
    await sleep(STAGE_CATALOG_POLL_MS);
  }

  return { created, queued, settled, failedParse, failedPodcastIds };
}

function finish(
  input: V4SeedStageCatalogInput,
  classification: StageCatalogClassification,
  apply: ApplyCounts,
  startedAt: number
): V4SeedStageCatalogResult {
  const result: V4SeedStageCatalogResult = {
    stage: input.stage,
    subscribed: classification.subscribed,
    viewedNotSubscribed: classification.viewedNotSubscribed,
    libraryOnly: classification.libraryOnly,
    alreadyLocal: classification.alreadyLocal,
    missing: classification.missing,
    nonPublic: classification.nonPublic,
    spam: classification.spam,
    takedown: classification.takedown,
    noPodcastIndexId: classification.noPodcastIndexId,
    skippedNoAuthorityUrl: classification.skippedNoAuthorityUrl,
    skippedInvalidId: classification.skippedInvalidId,
    toEnsure: classification.creates.length,
    created: apply.created,
    queued: apply.queued,
    settled: apply.settled,
    failedParse: apply.failedParse,
    failedPodcastIds: apply.failedPodcastIds,
    elapsedMs: Date.now() - startedAt,
  };
  getLogger().info('v4 stage catalog seed finished', {
    stage: result.stage,
    dryRun: input.dryRun,
    subscribed: result.subscribed,
    viewedNotSubscribed: result.viewedNotSubscribed,
    libraryOnly: result.libraryOnly,
    alreadyLocal: result.alreadyLocal,
    missing: result.missing,
    nonPublic: result.nonPublic,
    spam: result.spam,
    takedown: result.takedown,
    noPodcastIndexId: result.noPodcastIndexId,
    skippedNoAuthorityUrl: result.skippedNoAuthorityUrl,
    skippedInvalidId: result.skippedInvalidId,
    toEnsure: result.toEnsure,
    created: result.created,
    queued: result.queued,
    settled: result.settled,
    failedParse: result.failedParse,
    elapsedMs: result.elapsedMs,
  });
  return result;
}

/**
 * Seeds the shows one rehearsal stage needs, queues a first parse where none has started,
 * and waits until every mapped feed is settled. The wait has no deadline. A settled feed
 * with no finished parse is counted and does not throw. The log is the stage and the counts.
 */
export async function v4SeedStageCatalog(
  input: V4SeedStageCatalogInput
): Promise<V4SeedStageCatalogResult> {
  const startedAt = Date.now();
  assertStageIds(input.stage, input.v4Ids);
  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';
  if (connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }
  if (!input.dryRun) {
    assertLocalDatabase();
  }

  const shows = await readStageShows(connectionString, input.stage, input.v4Ids);
  const podcasts: V4PodcastKey[] = [];
  for (const show of shows) {
    if (show.podcast !== null) {
      podcasts.push(show.podcast);
    }
  }
  let catalog: LocalCatalog;
  try {
    catalog = await readStageChannels(podcasts);
  } catch (error) {
    throw new Error('Could not read the v5 channel index.', { cause: error });
  }
  const classification = classifyStageCatalog(shows, catalog);
  if (input.dryRun) {
    emitProgress(input.onProgress, startedAt, {
      created: 0,
      queued: 0,
      settled: 0,
      failedParse: 0,
      waiting: 0,
    });
    return finish(
      input,
      classification,
      {
        created: 0,
        queued: 0,
        settled: 0,
        failedParse: 0,
        failedPodcastIds: [],
      },
      startedAt
    );
  }

  const apply = await applyStage(classification, startedAt, input.onProgress);
  return finish(input, classification, apply, startedAt);
}
