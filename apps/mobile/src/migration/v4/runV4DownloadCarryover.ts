/**
 * Settles each media file the previous app downloaded. A directory episode becomes a finished
 * download. A show the directory has without that episode keeps the file on that show. An Add by
 * RSS file becomes an episode on that feed, or a finished download when the account cannot follow
 * that show. A file that cannot be named is deleted. A request that has not answered leaves the
 * file on disk.
 */
import { deriveMembershipState, evaluateFeatureAccess } from '@podverse/helpers';
import { createAddByRSSId, createAddByRSSIdText } from '@podverse/helpers/addByRSS/ids';
import type {
  DTOAddByRSSMatchFeed,
  DTOChannelDirectoryMatch,
  DTOItem,
  DTOLegacyEpisodeLookupAnswer,
  DTOLegacyEpisodeLookupRef,
} from '@podverse/helpers/dto';
import { LEGACY_EPISODE_LOOKUP_MAX_EPISODES } from '@podverse/helpers/dto';

import {
  requestWithMobileAuthRefresh,
  requestWithoutMobileAuth,
} from '../../auth/authRequestWithRefresh';
import { accountRepository } from '../../data/repositories/accountRepository';
import { classifySignupCarryFollowError } from '../../data/repositories/addByRssDevicePath';
import { addByRssPromotion } from '../../data/repositories/addByRssPromotion';
import { addByRssRepository } from '../../data/repositories/addByRssRepository';
import { channelItemsRepository } from '../../data/repositories/channelItemsRepository';
import { downloadsRepository } from '../../data/repositories/downloadsRepository';
import { playbackContentRepository } from '../../data/repositories/playbackContentRepository';
import { syncEventLogRepository } from '../../data/repositories/syncEventLogRepository';
import type { MobileAuthRequestContext } from '../../data/repositories/types';
import type {
  V4DownloadCarryoverRow,
  V4DownloadCarryoverStatus,
} from '../../data/repositories/v4DownloadCarryoverRepository';
import {
  V4_DOWNLOAD_CARRYOVER_DONE_CODE,
  v4DownloadCarryoverRepository,
} from '../../data/repositories/v4DownloadCarryoverRepository';
import { isItemDownloadable } from '../../downloads/downloadEligibility';
import { downloadManager } from '../../downloads/downloadManager';
import { downloadStore } from '../../downloads/downloadStore';
import { buildAddByRssMatchRefs } from '../../lib/addByRss/directoryMatch';
import { fetchAccountAddByRssFeedLimit } from '../../lib/addByRss/feedLimit';
import type { AddByRssCarriedEpisode } from '../../lib/addByRss/localEpisode';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { getOrCreateInstallationId } from '../../push/installationId';
import { requestAddByRssRefresh } from '../../sync/requestAddByRssRefresh';
import { requestLegacyLookup } from './legacyLookupRequest';
import type {
  V4DownloadDecision,
  V4DownloadDirectoryKept,
  V4DownloadDirectoryTarget,
  V4DownloadFailure,
} from './planV4DownloadCarryover';
import {
  decideV4DownloadAfterItemFetch,
  decideV4DownloadAfterLookup,
  decideV4DownloadAfterMatch,
  decideV4DownloadBeforeNetwork,
  planV4AddByRssMatch,
  settleV4DownloadFailure,
  V4_DOWNLOAD_SETTLED_STATUSES,
  v4AdoptedFileExtension,
  v4AdoptedFileName,
  v4DownloadCarryoverLogDetails,
  v4DownloadFallbackSource,
  v4KeptDirectoryItem,
  v4KeptItemIdText,
} from './planV4DownloadCarryover';
import type { V4DownloadRoots, V4LocateResult } from './v4DownloadFiles';
import {
  adoptV4DownloadFile,
  deleteV4DownloadFile,
  locateV4DownloadFile,
  removeUnfinishedAndroidDownloadJobs,
  resolveV4DownloadRoots,
} from './v4DownloadFiles';

export type V4DownloadCarryoverRunDeps = {
  /** The next Add by RSS refresh may ask the directory match without waiting out the hour. */
  clearDirectoryMatchPacing: () => void;
  /** Queues one more pass; called when this pass stopped at its time budget with rows left. */
  enqueueContinuation: () => void;
  /** The queue's auth context. `accessToken === null` is signed out. */
  getAuthContext: () => MobileAuthRequestContext;
  /** The job's signal; the queue aborts it at the job timeout. */
  signal: AbortSignal;
};

type CarriedFile =
  | { kind: 'found'; located: Extract<V4LocateResult, { kind: 'found' }> }
  | { kind: 'adopted'; fileName: string; byteSize: number | null };

type LocatedRow = {
  file: CarriedFile;
  index: number;
  row: V4DownloadCarryoverRow;
};

type AdoptionWork =
  | (LocatedRow & { kind: 'delete' })
  | (LocatedRow & { kind: 'directory'; target: V4DownloadDirectoryTarget })
  | (LocatedRow & { kind: 'directory_kept'; kept: V4DownloadDirectoryKept })
  | (LocatedRow & {
      episode: AddByRssCarriedEpisode;
      feedTitle: string | null;
      feedUrl: string;
      kind: 'add_by_rss';
    });

type CachedFeedPlacement =
  | { kind: 'feed' }
  | { kind: 'no_feed' }
  | { kind: 'refused' }
  | { kind: 'retry' }
  | { channelIdText: string; channelTitle: string | null; kind: 'directory' };

type FeedPlacement = CachedFeedPlacement | { kind: 'network' };

type PassState = {
  accountFeedsWritten: number;
  accountOwnedBaseline: number | null;
  adoptedDownloadIds: string[];
  adoptedLibrary: boolean;
  budgetReached: boolean;
  deps: V4DownloadCarryoverRunDeps;
  /** `undefined` until this pass has read it. `null` means the read failed. */
  feedLimit: number | null | undefined;
  feedPlacements: Map<string, CachedFeedPlacement>;
  networkError: unknown;
  pendingAtStart: number;
  roots: V4DownloadRoots;
  settledAny: boolean;
  spaceBlocked: boolean;
  startedAt: number;
};

type MoveResult =
  { file: Extract<CarriedFile, { kind: 'adopted' }>; kind: 'ready' } | { kind: 'stopped' };

/** No new file work starts after this. A copy already started is allowed to finish. */
const PASS_BUDGET_MS = 40000;

/** How long one request section may spend waiting on a rate-limit delay. */
const LOOKUP_WAIT_BUDGET_MS = 15000;

/**
 * Waiting rows are retried once per process. Pending rows keep scheduling the job.
 */
let waitingRetriedThisSession = false;

/** Unfinished v4 transfers are removed once per process, before any file is located. */
let androidJobsRemoved = false;

let inFlight: Promise<void> | null = null;

const unreachable = (_value: never): never => {
  throw new Error('Unexpected carryover decision');
};

const trimmedOrNull = (value: string | null): string | null => {
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const budgetLeft = (state: PassState): boolean => {
  if (state.deps.signal.aborted) {
    return false;
  }
  if (Date.now() - state.startedAt >= PASS_BUDGET_MS) {
    state.budgetReached = true;
    return false;
  }
  return true;
};

const isHeldDownload = (
  status: string
): status is 'complete' | 'downloading' | 'paused' | 'queued' =>
  status === 'queued' || status === 'downloading' || status === 'paused' || status === 'complete';

const retry = async (row: V4DownloadCarryoverRow): Promise<void> => {
  await v4DownloadCarryoverRepository.bumpAttempts(row.fileKey);
  await v4DownloadCarryoverRepository.setStatus(row.fileKey, 'waiting');
};

const settle = async (
  state: PassState,
  row: V4DownloadCarryoverRow,
  status: V4DownloadCarryoverStatus
): Promise<void> => {
  await v4DownloadCarryoverRepository.setStatus(row.fileKey, status);
  if (V4_DOWNLOAD_SETTLED_STATUSES.includes(status)) {
    state.settledAny = true;
  }
  if (status === 'directory' || status === 'add_by_rss') {
    state.adoptedLibrary = true;
  }
  if (
    (status === 'missing' || status === 'deleted' || status === 'duplicate') &&
    row.adoptedFileName !== null
  ) {
    await v4DownloadCarryoverRepository.setAdoptedFileName(row.fileKey, null);
    row.adoptedFileName = null;
  }
};

const failure = async (
  state: PassState,
  row: V4DownloadCarryoverRow,
  file: CarriedFile | null,
  kind: V4DownloadFailure
): Promise<void> => {
  const outcome = settleV4DownloadFailure(row, kind);
  switch (outcome.kind) {
    case 'retry':
      await retry(row);
      return;
    case 'final':
      await settle(state, row, outcome.status);
      return;
    case 'delete':
      if (file === null) {
        await retry(row);
        return;
      }
      await deleteCarried(state, row, file, 'deleted');
      return;
    default:
      throw unreachable(outcome);
  }
};

const deleteCarried = async (
  state: PassState,
  row: V4DownloadCarryoverRow,
  file: CarriedFile,
  status: 'deleted' | 'duplicate'
): Promise<void> => {
  if (file.kind === 'adopted') {
    try {
      await downloadsRepository.deleteStoredFile(file.fileName);
    } catch {
      // The copy under downloads/ still counts as removed when the delete throws.
    }
    await settle(state, row, status);
    return;
  }

  const removed = await deleteV4DownloadFile(file.located, state.roots);
  if (removed.kind === 'deleted') {
    await settle(state, row, status);
    return;
  }
  await failure(state, row, file, 'delete_failed');
};

const moveIntoDownloads = async (
  state: PassState,
  row: V4DownloadCarryoverRow,
  file: CarriedFile,
  fileExtension: string | null
): Promise<MoveResult> => {
  if (file.kind === 'adopted') {
    return { file, kind: 'ready' };
  }
  if (state.spaceBlocked) {
    return { kind: 'stopped' };
  }

  const targetName = v4AdoptedFileName(row, fileExtension);
  await v4DownloadCarryoverRepository.setAdoptedFileName(row.fileKey, targetName);
  row.adoptedFileName = targetName;

  let result = await adoptV4DownloadFile(file.located, targetName, state.roots);
  if (result.kind === 'target_exists') {
    await downloadsRepository.deleteStoredFile(targetName);
    result = await adoptV4DownloadFile(file.located, targetName, state.roots);
    if (result.kind !== 'adopted') {
      await failure(state, row, file, 'adopt_failed');
      return { kind: 'stopped' };
    }
  }

  if (result.kind === 'adopted') {
    return {
      file: { byteSize: result.byteSize, fileName: result.fileName, kind: 'adopted' },
      kind: 'ready',
    };
  }

  if (result.kind === 'failed' && result.reason === 'source_missing') {
    await settle(state, row, 'missing');
    return { kind: 'stopped' };
  }
  if (result.kind === 'failed' && result.reason === 'insufficient_space') {
    state.spaceBlocked = true;
  }
  await failure(state, row, file, 'adopt_failed');
  return { kind: 'stopped' };
};

const extensionForItem = (row: V4DownloadCarryoverRow, item: DTOItem): string | null => {
  const fromRow = v4AdoptedFileExtension(row);
  if (fromRow !== null) {
    return fromRow;
  }
  const eligibility = isItemDownloadable(item);
  return eligibility.ok ? eligibility.source.fileExtension : null;
};

const recordKeptDownload = async (
  state: PassState,
  row: V4DownloadCarryoverRow,
  file: CarriedFile,
  kept: V4DownloadDirectoryKept
): Promise<'continue' | 'stop'> => {
  const fileExtension = v4AdoptedFileExtension(row);
  const moved = await moveIntoDownloads(state, row, file, fileExtension);
  if (moved.kind !== 'ready') {
    return 'continue';
  }

  const adopted = await downloadManager.adoptCompletedFile({
    byteSize: moved.file.byteSize,
    channel: { channelIdText: kept.channelIdText, channelTitle: kept.channelTitle },
    fallbackArtworkUrl: kept.fallbackArtworkUrl,
    fallbackSource: kept.fallbackSource,
    fileExtension,
    fileName: moved.file.fileName,
    item: kept.item,
  });
  if (adopted === 'exists') {
    await deleteCarried(state, row, moved.file, 'duplicate');
    return 'continue';
  }
  if (adopted === 'ineligible') {
    await retry(row);
    return 'continue';
  }

  let keptOutcome: 'kept' | 'server_listed' | 'skipped';
  try {
    keptOutcome = await channelItemsRepository.keepDownloadedItem({
      channelIdText: kept.channelIdText,
      item: kept.item,
    });
  } catch {
    await retry(row);
    return 'continue';
  }
  if (keptOutcome === 'skipped') {
    await retry(row);
    return 'continue';
  }
  await settle(state, row, 'directory');
  return 'continue';
};

const rememberPlacement = (
  state: PassState,
  feedUrl: string,
  placement: CachedFeedPlacement
): CachedFeedPlacement => {
  state.feedPlacements.set(feedUrl, placement);
  return placement;
};

const placeFeed = async (
  state: PassState,
  feedUrl: string,
  feedTitle: string | null
): Promise<FeedPlacement> => {
  const cached = state.feedPlacements.get(feedUrl);
  if (cached !== undefined) {
    return cached;
  }

  const stored = await addByRssRepository.getFeedByUrl(feedUrl);
  if (stored !== null) {
    return rememberPlacement(state, feedUrl, { kind: 'feed' });
  }

  if (state.deps.getAuthContext().accessToken === null) {
    const wrote = await addByRssRepository.addSignedOutFeedStub({
      feedUrl,
      title: feedTitle,
    });
    if (!wrote) {
      return rememberPlacement(state, feedUrl, { kind: 'no_feed' });
    }
    return rememberPlacement(state, feedUrl, { kind: 'feed' });
  }

  const account = await accountRepository.getSnapshot();
  if (account === null) {
    return rememberPlacement(state, feedUrl, { kind: 'retry' });
  }
  if (!evaluateFeatureAccess('add_by_rss_add', deriveMembershipState(account)).allowed) {
    return rememberPlacement(state, feedUrl, { kind: 'refused' });
  }

  if (state.feedLimit === undefined) {
    state.feedLimit = await fetchAccountAddByRssFeedLimit(state.deps.getAuthContext());
  }
  if (state.feedLimit === null) {
    return rememberPlacement(state, feedUrl, { kind: 'retry' });
  }

  if (state.accountOwnedBaseline === null) {
    const ownership = await addByRssRepository.listFollowedOwnership();
    let owned = 0;
    for (const entry of ownership) {
      if (!entry.signedOutOwned) {
        owned += 1;
      }
    }
    state.accountOwnedBaseline = owned;
  }
  if (state.accountOwnedBaseline + state.accountFeedsWritten >= state.feedLimit) {
    return rememberPlacement(state, feedUrl, { kind: 'refused' });
  }

  let followed: { directory_channel: DTOChannelDirectoryMatch | null };
  try {
    followed = await requestWithMobileAuthRefresh(state.deps.getAuthContext(), (api) =>
      api.reqAccountFollowAddByRSSChannel({
        feed_url: feedUrl,
        image_url: null,
        title: feedTitle ?? feedUrl,
      })
    );
  } catch (error) {
    const outcome = classifySignupCarryFollowError(error);
    if (outcome === 'stop' || outcome === 'skip') {
      return rememberPlacement(state, feedUrl, { kind: 'refused' });
    }
    state.networkError = error;
    return { kind: 'network' };
  }

  const channel = followed.directory_channel;
  if (channel !== null) {
    try {
      const subscribed = await addByRssPromotion.subscribeDirectoryChannel(channel.id_text);
      if (subscribed === null) {
        return rememberPlacement(state, feedUrl, { kind: 'retry' });
      }
    } catch {
      return rememberPlacement(state, feedUrl, { kind: 'retry' });
    }
    return rememberPlacement(state, feedUrl, {
      channelIdText: channel.id_text,
      channelTitle: trimmedOrNull(channel.title),
      kind: 'directory',
    });
  }

  const title = feedTitle?.trim() ?? '';
  const idText = createAddByRSSIdText();
  await addByRssRepository.upsertFeed({
    enclosureUrl: null,
    feedUrl,
    followed: true,
    id: createAddByRSSId(idText),
    idText,
    imageUrl: null,
    latestItemPubDateMs: null,
    playbackPosition: null,
    resourceType: 'podcasts',
    title: title.length > 0 ? title : feedUrl,
    updatedAt: new Date().toISOString(),
  });
  state.accountFeedsWritten += 1;
  return rememberPlacement(state, feedUrl, { kind: 'feed' });
};

const adoptOntoFeed = async (
  state: PassState,
  row: V4DownloadCarryoverRow,
  file: Extract<CarriedFile, { kind: 'adopted' }>,
  episode: AddByRssCarriedEpisode,
  feedUrl: string
): Promise<void> => {
  const adoption = await addByRssRepository.adoptDownloadedEpisode({
    episode,
    feedUrl,
    fileName: file.fileName,
    fileSizeBytes: file.byteSize,
  });
  if (adoption.kind === 'feed_episode' || adoption.kind === 'local_episode') {
    state.adoptedDownloadIds.push(adoption.downloadIdText);
    await settle(state, row, 'add_by_rss');
    return;
  }
  if (adoption.kind === 'already_downloaded') {
    const stored = await downloadsRepository.getByItemIdText(adoption.downloadIdText);
    if (stored !== null && stored.filePath === file.fileName) {
      state.adoptedDownloadIds.push(adoption.downloadIdText);
      await settle(state, row, 'add_by_rss');
      return;
    }
    await deleteCarried(state, row, file, 'duplicate');
    return;
  }
  await failure(state, row, file, 'no_feed');
};

const adoptDownloadsOnly = async (
  state: PassState,
  row: V4DownloadCarryoverRow,
  file: Extract<CarriedFile, { kind: 'adopted' }>,
  episode: AddByRssCarriedEpisode,
  feedTitle: string | null
): Promise<void> => {
  const fileExtension = v4AdoptedFileExtension(row);
  const fallbackSource = v4DownloadFallbackSource(row, fileExtension);
  if (fallbackSource === null) {
    await retry(row);
    return;
  }
  const item = v4KeptDirectoryItem(row, v4KeptItemIdText(row.fileKey));
  const adopted = await downloadManager.adoptCompletedFile({
    byteSize: file.byteSize,
    channel: { channelIdText: null, channelTitle: trimmedOrNull(feedTitle) },
    fallbackArtworkUrl: episode.imageUrl,
    fallbackSource,
    fileExtension,
    fileName: file.fileName,
    item,
  });
  if (adopted === 'adopted') {
    await settle(state, row, 'add_by_rss');
    return;
  }
  if (adopted === 'ineligible') {
    await retry(row);
    return;
  }
  const stored = downloadStore.get(item.id_text);
  if (stored !== null && stored.filePath === file.fileName) {
    await settle(state, row, 'add_by_rss');
    return;
  }
  await deleteCarried(state, row, file, 'duplicate');
};

const runAddByRss = async (
  state: PassState,
  row: V4DownloadCarryoverRow,
  file: CarriedFile,
  episode: AddByRssCarriedEpisode,
  feedTitle: string | null,
  feedUrl: string
): Promise<'continue' | 'stop'> => {
  const moved = await moveIntoDownloads(state, row, file, v4AdoptedFileExtension(row));
  if (moved.kind !== 'ready') {
    return 'continue';
  }

  const placement = await placeFeed(state, feedUrl, feedTitle);
  if (placement.kind === 'network') {
    return 'stop';
  }
  if (placement.kind === 'retry') {
    await retry(row);
    return 'continue';
  }
  if (placement.kind === 'no_feed') {
    await failure(state, row, moved.file, 'no_feed');
    return 'continue';
  }
  if (placement.kind === 'refused') {
    await adoptDownloadsOnly(state, row, moved.file, episode, feedTitle);
    return 'continue';
  }
  if (placement.kind === 'directory') {
    const fileExtension = v4AdoptedFileExtension(row);
    const fallbackSource = v4DownloadFallbackSource(row, fileExtension);
    if (fallbackSource === null) {
      await retry(row);
      return 'continue';
    }
    return recordKeptDownload(state, row, moved.file, {
      channelIdText: placement.channelIdText,
      channelTitle: placement.channelTitle,
      fallbackArtworkUrl: episode.imageUrl,
      fallbackSource,
      item: v4KeptDirectoryItem(row, v4KeptItemIdText(row.fileKey)),
    });
  }

  await adoptOntoFeed(state, row, moved.file, episode, feedUrl);
  return 'continue';
};

const continueFetchedDecision = async (
  state: PassState,
  row: V4DownloadCarryoverRow,
  file: CarriedFile,
  decision: V4DownloadDecision
): Promise<'continue' | 'stop'> => {
  switch (decision.kind) {
    case 'directory_kept':
      return recordKeptDownload(state, row, file, decision.kept);
    case 'delete':
      await deleteCarried(state, row, file, 'deleted');
      return 'continue';
    case 'retry':
    case 'lookup':
    case 'match':
    case 'directory':
    case 'add_by_rss':
      await retry(row);
      return 'continue';
    default:
      throw unreachable(decision);
  }
};

const loadDirectoryItem = async (
  state: PassState,
  row: V4DownloadCarryoverRow,
  target: V4DownloadDirectoryTarget
): Promise<
  | { item: DTOItem; kind: 'item' }
  | { decision: V4DownloadDecision; kind: 'decision' }
  | { kind: 'stop' }
> => {
  const stored = await playbackContentRepository.getStoredItemByIdText(target.itemIdText);
  if (stored !== null) {
    return { item: stored, kind: 'item' };
  }

  try {
    const result = await requestLegacyLookup(
      () => requestWithoutMobileAuth((api) => api.reqItemGetByIdOrIdText(target.itemIdText)),
      () => 0
    );
    if (result.kind === 'http') {
      return {
        decision: decideV4DownloadAfterItemFetch(
          row,
          target,
          result.status === 404 ? 'gone' : 'failed'
        ),
        kind: 'decision',
      };
    }
    return { item: result.value, kind: 'item' };
  } catch (error) {
    state.networkError = error;
    return { kind: 'stop' };
  }
};

const runDirectory = async (
  state: PassState,
  row: V4DownloadCarryoverRow,
  file: CarriedFile,
  target: V4DownloadDirectoryTarget
): Promise<'continue' | 'stop'> => {
  const loaded = await loadDirectoryItem(state, row, target);
  if (loaded.kind === 'stop') {
    return 'stop';
  }
  if (loaded.kind === 'decision') {
    return continueFetchedDecision(state, row, file, loaded.decision);
  }

  const item = loaded.item;
  const existing = downloadStore.get(item.id_text);
  if (
    existing !== null &&
    isHeldDownload(existing.status) &&
    existing.filePath !== row.adoptedFileName
  ) {
    await deleteCarried(state, row, file, 'duplicate');
    return 'continue';
  }

  const fileExtension = extensionForItem(row, item);
  const moved = await moveIntoDownloads(state, row, file, fileExtension);
  if (moved.kind !== 'ready') {
    return 'continue';
  }

  const adopted = await downloadManager.adoptCompletedFile({
    byteSize: moved.file.byteSize,
    channel: { channelIdText: target.channelIdText, channelTitle: target.channelTitle },
    fallbackArtworkUrl: target.fallbackArtworkUrl,
    fallbackSource: v4DownloadFallbackSource(row, fileExtension),
    fileExtension,
    fileName: moved.file.fileName,
    item,
  });
  if (adopted === 'adopted') {
    await settle(state, row, 'directory');
    return 'continue';
  }
  await deleteCarried(state, row, moved.file, adopted === 'exists' ? 'duplicate' : 'deleted');
  return 'continue';
};

const runAdoption = async (state: PassState, work: AdoptionWork): Promise<'continue' | 'stop'> => {
  switch (work.kind) {
    case 'delete':
      await deleteCarried(state, work.row, work.file, 'deleted');
      return 'continue';
    case 'directory':
      return runDirectory(state, work.row, work.file, work.target);
    case 'directory_kept':
      return recordKeptDownload(state, work.row, work.file, work.kept);
    case 'add_by_rss':
      return runAddByRss(state, work.row, work.file, work.episode, work.feedTitle, work.feedUrl);
    default:
      throw unreachable(work);
  }
};

const locateRow = async (
  state: PassState,
  row: V4DownloadCarryoverRow
): Promise<CarriedFile | null> => {
  const located = await locateV4DownloadFile(
    {
      adoptedFileName: row.adoptedFileName,
      fileKey: row.fileKey,
      orphanRoot: row.orphanRoot,
    },
    state.roots
  );
  switch (located.kind) {
    case 'not_found':
      await settle(state, row, 'missing');
      return null;
    case 'unreachable':
      await failure(state, row, null, 'unreachable');
      return null;
    case 'found':
      return { kind: 'found', located };
    case 'already_adopted': {
      const again = await locateV4DownloadFile(
        { adoptedFileName: null, fileKey: row.fileKey, orphanRoot: row.orphanRoot },
        state.roots
      );
      if (again.kind === 'found') {
        if (row.adoptedFileName !== null) {
          await downloadsRepository.deleteStoredFile(row.adoptedFileName);
        }
        return { kind: 'found', located: again };
      }
      return { byteSize: located.byteSize, fileName: located.fileName, kind: 'adopted' };
    }
    default:
      throw unreachable(located);
  }
};

const queueDecision = (
  works: AdoptionWork[],
  located: LocatedRow,
  decision: V4DownloadDecision
): 'leave' | 'queued' | 'retry' => {
  switch (decision.kind) {
    case 'delete':
      works.push({ ...located, kind: 'delete' });
      return 'queued';
    case 'directory':
      works.push({ ...located, kind: 'directory', target: decision.target });
      return 'queued';
    case 'directory_kept':
      works.push({ ...located, kept: decision.kept, kind: 'directory_kept' });
      return 'queued';
    case 'add_by_rss':
      works.push({
        ...located,
        episode: decision.episode,
        feedTitle: decision.feedTitle,
        feedUrl: decision.feedUrl,
        kind: 'add_by_rss',
      });
      return 'queued';
    case 'retry':
      return 'retry';
    case 'lookup':
    case 'match':
      return 'leave';
    default:
      throw unreachable(decision);
  }
};

const adoptionRank = (kind: AdoptionWork['kind']): number => {
  switch (kind) {
    case 'delete':
      return 0;
    case 'directory':
      return 1;
    case 'directory_kept':
      return 2;
    case 'add_by_rss':
      return 3;
    default:
      throw unreachable(kind);
  }
};

const loadEpisodeAnswers = async (
  lookups: readonly (LocatedRow & { ref: DTOLegacyEpisodeLookupRef })[],
  remainingMs: () => number
): Promise<Map<string, DTOLegacyEpisodeLookupAnswer>> => {
  const answers = new Map<string, DTOLegacyEpisodeLookupAnswer>();
  const refs: DTOLegacyEpisodeLookupRef[] = [];
  const seen = new Set<string>();
  for (const entry of lookups) {
    if (seen.has(entry.ref.episode_id)) {
      continue;
    }
    seen.add(entry.ref.episode_id);
    refs.push(entry.ref);
  }

  const installId = await getOrCreateInstallationId();
  let stop = false;
  for (let offset = 0; offset < refs.length; offset += LEGACY_EPISODE_LOOKUP_MAX_EPISODES) {
    if (stop) {
      break;
    }
    const episodes = refs.slice(offset, offset + LEGACY_EPISODE_LOOKUP_MAX_EPISODES);
    const result = await requestLegacyLookup(
      () =>
        requestWithoutMobileAuth((api) =>
          api.reqLegacyEpisodeLookup({
            episodes,
            install_id: installId,
          })
        ),
      remainingMs
    );
    if (result.kind === 'http') {
      stop = true;
      continue;
    }
    const chunkAnswers = Array.isArray(result.value.answers) ? result.value.answers : [];
    for (const answer of chunkAnswers) {
      answers.set(answer.episode_id, answer);
    }
  }
  return answers;
};

const loadMatchAnswers = async (
  rows: readonly V4DownloadCarryoverRow[],
  remainingMs: () => number
): Promise<{
  failed: Set<string>;
  matches: Map<string, DTOAddByRSSMatchFeed>;
  positions: ReadonlyMap<string, { feedUrl: string; itemIndex: number }>;
}> => {
  const planned = planV4AddByRssMatch(rows);
  const chunks = buildAddByRssMatchRefs(planned.feeds);
  const matches = new Map<string, DTOAddByRSSMatchFeed>();
  const failed = new Set<string>();
  let stop = false;
  for (const chunk of chunks) {
    if (stop) {
      for (const feed of chunk) {
        failed.add(feed.feed_url);
      }
      continue;
    }
    const result = await requestLegacyLookup(
      () => requestWithoutMobileAuth((api) => api.reqChannelAddByRSSMatch({ feeds: chunk })),
      remainingMs
    );
    if (result.kind === 'http') {
      stop = true;
      for (const feed of chunk) {
        failed.add(feed.feed_url);
      }
      continue;
    }
    const answered = Array.isArray(result.value.matches) ? result.value.matches : [];
    for (const match of answered) {
      matches.set(match.feed_url, match);
    }
  }
  return { failed, matches, positions: planned.positions };
};

const finishPass = async (state: PassState): Promise<void> => {
  for (const downloadIdText of state.adoptedDownloadIds) {
    const stored = await downloadsRepository.getByItemIdText(downloadIdText);
    if (stored !== null) {
      downloadStore.put(stored);
    }
  }
  if (state.adoptedLibrary) {
    homeFeedRefresh.notify();
  }

  const remaining = (await v4DownloadCarryoverRepository.listByStatus(['pending'])).length;
  if (remaining === 0 && state.settledAny) {
    const counts = await v4DownloadCarryoverRepository.counts();
    await syncEventLogRepository.append({
      details: v4DownloadCarryoverLogDetails(counts.byStatus),
      errorCode: V4_DOWNLOAD_CARRYOVER_DONE_CODE,
      jobKind: 'v4-download-carryover',
      message: null,
      occurredAt: Date.now(),
      outcome: 'reconciled',
    });
  }
  if (remaining === 0 && state.pendingAtStart > 0) {
    state.deps.clearDirectoryMatchPacing();
    requestAddByRssRefresh();
  }
  if (
    state.budgetReached &&
    !state.deps.signal.aborted &&
    state.networkError === null &&
    remaining > 0
  ) {
    state.deps.enqueueContinuation();
  }
  if (state.networkError !== null && state.networkError !== undefined) {
    throw state.networkError;
  }
};

const executeV4DownloadCarryover = async (deps: V4DownloadCarryoverRunDeps): Promise<void> => {
  const startedAt = Date.now();
  const includeWaiting = !waitingRetriedThisSession;
  const rows = await v4DownloadCarryoverRepository.listByStatus(
    includeWaiting ? ['pending', 'waiting'] : ['pending']
  );
  if (rows.length === 0) {
    return;
  }

  let pendingAtStart = 0;
  for (const row of rows) {
    if (row.status === 'pending') {
      pendingAtStart += 1;
    }
  }

  if (!androidJobsRemoved && rows.some((row) => row.source === 'downloading')) {
    await removeUnfinishedAndroidDownloadJobs();
    androidJobsRemoved = true;
  }

  const roots = await resolveV4DownloadRoots(await v4DownloadCarryoverRepository.getSharedFolder());
  if (roots === null) {
    return;
  }
  await downloadManager.hydrate();

  const state: PassState = {
    accountFeedsWritten: 0,
    accountOwnedBaseline: null,
    adoptedDownloadIds: [],
    adoptedLibrary: false,
    budgetReached: false,
    deps,
    feedLimit: undefined,
    feedPlacements: new Map(),
    networkError: null,
    pendingAtStart,
    roots,
    settledAny: false,
    spaceBlocked: false,
    startedAt,
  };

  const localDeletes: LocatedRow[] = [];
  const lookups: (LocatedRow & { ref: DTOLegacyEpisodeLookupRef })[] = [];
  const matchRows: LocatedRow[] = [];
  const works: AdoptionWork[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const row = rows[index];
    if (row === undefined) {
      continue;
    }
    const file = await locateRow(state, row);
    if (file === null) {
      continue;
    }
    const located: LocatedRow = { file, index, row };
    const decision = decideV4DownloadBeforeNetwork(row);
    switch (decision.kind) {
      case 'delete':
        localDeletes.push(located);
        break;
      case 'lookup':
        lookups.push({ ...located, ref: decision.ref });
        break;
      case 'match':
        matchRows.push(located);
        break;
      case 'add_by_rss':
        works.push({
          ...located,
          episode: decision.episode,
          feedTitle: decision.feedTitle,
          feedUrl: decision.feedUrl,
          kind: 'add_by_rss',
        });
        break;
      case 'retry':
        await retry(row);
        break;
      case 'directory':
        works.push({ ...located, kind: 'directory', target: decision.target });
        break;
      case 'directory_kept':
        works.push({ ...located, kept: decision.kept, kind: 'directory_kept' });
        break;
      default:
        throw unreachable(decision);
    }
  }

  for (const located of localDeletes) {
    if (!budgetLeft(state)) {
      break;
    }
    await deleteCarried(state, located.row, located.file, 'deleted');
  }

  const requestsNeeded = lookups.length > 0 || matchRows.length > 0;
  let lookupAnswers = new Map<string, DTOLegacyEpisodeLookupAnswer>();
  let matchAnswers: {
    failed: Set<string>;
    matches: Map<string, DTOAddByRSSMatchFeed>;
    positions: ReadonlyMap<string, { feedUrl: string; itemIndex: number }>;
  } | null = null;
  if (requestsNeeded) {
    const lookupStartedAt = Date.now();
    const remainingMs = (): number => LOOKUP_WAIT_BUDGET_MS - (Date.now() - lookupStartedAt);
    try {
      if (lookups.length > 0) {
        lookupAnswers = await loadEpisodeAnswers(lookups, remainingMs);
      }
      if (matchRows.length > 0) {
        matchAnswers = await loadMatchAnswers(
          matchRows.map((entry) => entry.row),
          remainingMs
        );
      }
    } catch (error) {
      state.networkError = error;
    }
  }

  if (state.networkError === null && rows.some((row) => row.status === 'waiting')) {
    waitingRetriedThisSession = true;
  }

  if (state.networkError === null) {
    for (const entry of lookups) {
      const queued = queueDecision(
        works,
        entry,
        decideV4DownloadAfterLookup(entry.row, lookupAnswers.get(entry.ref.episode_id))
      );
      if (queued === 'retry') {
        await retry(entry.row);
      }
    }
    for (const entry of matchRows) {
      const position = matchAnswers?.positions.get(entry.row.fileKey);
      let decision: V4DownloadDecision;
      if (
        matchAnswers === null ||
        position === undefined ||
        matchAnswers.failed.has(position.feedUrl)
      ) {
        decision = decideV4DownloadAfterMatch(entry.row, { kind: 'failed' });
      } else {
        decision = decideV4DownloadAfterMatch(entry.row, {
          itemIndex: position.itemIndex,
          kind: 'answered',
          match: matchAnswers.matches.get(position.feedUrl) ?? null,
        });
      }
      const queued = queueDecision(works, entry, decision);
      if (queued === 'retry') {
        await retry(entry.row);
      }
    }
  }

  works.sort(
    (left, right) => adoptionRank(left.kind) - adoptionRank(right.kind) || left.index - right.index
  );

  for (const work of works) {
    if (!budgetLeft(state)) {
      break;
    }
    const step = await runAdoption(state, work);
    if (step === 'stop') {
      break;
    }
  }

  await finishPass(state);
};

/**
 * True while staged files are still pending. Rows already waiting are tried once per process.
 */
export const shouldScheduleV4DownloadCarryover = async (): Promise<boolean> => {
  const pending = await v4DownloadCarryoverRepository.listByStatus(['pending']);
  if (pending.length > 0) {
    return true;
  }
  if (waitingRetriedThisSession) {
    return false;
  }
  const waiting = await v4DownloadCarryoverRepository.listByStatus(['waiting']);
  return waiting.length > 0;
};

/** Resolves staged download files. Overlapping runs share one pass. */
export const runV4DownloadCarryover = (deps: V4DownloadCarryoverRunDeps): Promise<void> => {
  if (inFlight !== null) {
    return inFlight;
  }
  const run = executeV4DownloadCarryover(deps).finally(() => {
    inFlight = null;
  });
  inFlight = run;
  return run;
};
