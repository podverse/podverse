import { deriveMembershipState, evaluateFeatureAccess, sleep } from '@podverse/helpers';
import type { DTOAccount } from '@podverse/helpers/dto';
import { getErrorResponseStatus } from '@podverse/helpers/error';
import { parseAuthSessionEndedError } from '@podverse/helpers-requests';

import {
  reconcileAccountPrefsFromAccount,
  registerPushDeviceForAccount,
} from '../auth/syncAccountPrefs';
import type { NativeCacheBrowseNode } from '../data/nativeCache';
import { accountRepository } from '../data/repositories/accountRepository';
import { runAddByRssLoginSettle } from '../data/repositories/addByRssLoginSettle';
import type { AddByRssRefreshTicket } from '../data/repositories/addByRssRepository';
import { addByRssRepository } from '../data/repositories/addByRssRepository';
import { autoDownloadRepository } from '../data/repositories/autoDownloadRepository';
import { channelItemsRepository } from '../data/repositories/channelItemsRepository';
import type { ChannelItemWindow } from '../data/repositories/channelItemWindow';
import { CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH } from '../data/repositories/channelItemWindow';
import { channelLiveStatusRepository } from '../data/repositories/channelLiveStatusRepository';
import { channelSeenRepository } from '../data/repositories/channelSeenRepository';
import { syncDirectoryChannelOrDropGone } from '../data/repositories/directoryChannelGone';
import { homeClipsCacheRepository } from '../data/repositories/homeClipsCacheRepository';
import { homeLivestreamsCacheRepository } from '../data/repositories/homeLivestreamsCacheRepository';
import { identityRemapRepository } from '../data/repositories/identityRemapRepository';
import { playbackOutboxRepository } from '../data/repositories/playbackOutboxRepository';
import { queueRepository } from '../data/repositories/queueRepository';
import { statsRepository } from '../data/repositories/statsRepository';
import type { SubscribedChannel } from '../data/repositories/subscriptionsRepository';
import { subscriptionsRepository } from '../data/repositories/subscriptionsRepository';
import type { MobileAuthRequestContext } from '../data/repositories/types';
import { shouldDeferAutoDownloadEvaluateToCatchUp } from '../downloads/autoDownloadCatchUpSession';
import { runAutoDownloadEvaluate } from '../downloads/autoDownloadEvaluate';
import { runAutoDownloadRegistration } from '../downloads/autoDownloadRegistration';
import type { AddByRssParsePath } from '../lib/addByRss/parsePath';
import { resolveAddByRssParsePath } from '../lib/addByRss/parsePath';
import { readIsPlayingLocallyForSync } from '../playback/playbackSyncState';
import {
  DEFAULT_HOME_RANGE,
  homeClipsQueryFromPrefs,
  homeSortToApiRange,
  readHomeListPrefs,
} from '../prefs/homeListPrefs';
import { termsBlocksAccountSync } from '../terms/termsSyncGate';
import { publishPlaybackPositionAdoptions } from './playbackPositionAdoption';
import { publishPlaybackReconcileConflicts } from './playbackReconcileConflict';
import { publishQueueDataChanged } from './queueDataRevision';
import type { SyncJobKind } from './syncJobKinds';
import { SYNC_JOB_LABEL_KEYS } from './syncJobKinds';
import type { PlannedSyncJob } from './syncJobPlan';
import type { SyncJob, SyncJobContext, SyncJobPriority } from './syncQueue';
import { DEFAULT_SYNC_JOB_TIMEOUT_MS } from './syncQueue';

/**
 * Job bodies for the serial sync queue.
 *
 * These are orchestration only: every API call and every write belongs to a repository, so a job
 * reads as the sequence of steps it performs. Anything genuinely reusable stays behind the
 * repository boundary where screens can reach it too.
 */

export type SyncJobDeps = {
  /**
   * Read at the moment a job runs rather than when it was queued. A job can sit behind others for
   * long enough that the tokens it was built with have already been rotated out from under it.
   */
  getAuthContext: () => MobileAuthRequestContext;
  /** Hydrate the queue store from SQLite once the abridged index has landed. */
  loadActiveQueue: () => Promise<void>;
  setAccount: (account: DTOAccount) => void;
};

/**
 * Work in progress for one account refresh, shared by the jobs it fans out into.
 *
 * A directory walk spans several jobs and can only be adopted whole, so the pages accumulate here
 * until the commit job takes them. The playlist nodes ride along so the projection can run whether
 * or not their fetch succeeded.
 */
type SyncRunScratch = {
  directoryEntries: SubscribedChannel[];
  playlistNodes: NativeCacheBrowseNode[];
  subscriptionPages: Set<number>;
};

const buildJob = (
  kind: SyncJobKind,
  priority: SyncJobPriority,
  dedupeKey: string,
  run: SyncJob['run'],
  timeoutMs?: number
): SyncJob => {
  return {
    dedupeKey,
    kind,
    labelKey: SYNC_JOB_LABEL_KEYS[kind],
    priority,
    run,
    timeoutMs,
  };
};

/**
 * A channel's budget scales with how far back it stores, because that is how many pages the walk
 * has to make. The ceiling matters more than the arithmetic: a serial queue is only as available as
 * its head, so no single channel may hold it for longer than this however deep it has been extended.
 */
const CHANNEL_ITEMS_MAX_TIMEOUT_MS = 60000;
const CHANNEL_ITEMS_PER_PAGE_TIMEOUT_MS = 12000;
const CHANNEL_ITEMS_PAGE_SIZE = 60;

const channelItemsTimeoutMs = (depth: number): number => {
  const pages = Math.max(1, Math.ceil(depth / CHANNEL_ITEMS_PAGE_SIZE));
  return Math.min(
    CHANNEL_ITEMS_MAX_TIMEOUT_MS,
    Math.max(DEFAULT_SYNC_JOB_TIMEOUT_MS, pages * CHANNEL_ITEMS_PER_PAGE_TIMEOUT_MS)
  );
};

const createAutoDownloadEvaluateJob = (
  priority: SyncJobPriority,
  channelIdTexts?: readonly string[]
): SyncJob => {
  const dedupe =
    channelIdTexts === undefined || channelIdTexts.length === 0
      ? 'auto-download-evaluate'
      : `auto-download-evaluate:${[...channelIdTexts].sort().join(',')}`;
  return buildJob('auto-download-evaluate', priority, dedupe, async () => {
    const account = await accountRepository.getSnapshot();
    const membershipAllows =
      account !== null &&
      evaluateFeatureAccess('auto_download', deriveMembershipState(account)).allowed;
    await runAutoDownloadEvaluate({
      channelIdTexts,
      membershipAllows,
      mode: 'incremental',
    });
  });
};

const enqueueAutoDownloadEvaluateIfReady = (
  context: SyncJobContext,
  priority: SyncJobPriority,
  channelIdTexts: readonly string[]
): void => {
  if (shouldDeferAutoDownloadEvaluateToCatchUp()) {
    return;
  }
  context.enqueue(createAutoDownloadEvaluateJob(priority, channelIdTexts));
};

const createChannelItemsJob = (
  deps: SyncJobDeps,
  priority: SyncJobPriority,
  window: ChannelItemWindow
): SyncJob => {
  return buildJob(
    'channel-items',
    priority,
    `channel-items:${window.channelIdText}`,
    async (context) => {
      const outcome = await syncDirectoryChannelOrDropGone(
        deps.getAuthContext(),
        window.channelIdText
      );
      if (outcome.kind === 'remapped') {
        context.enqueue(
          createChannelItemsJob(deps, priority, {
            channelIdText: outcome.toIdText,
            depth: CHANNEL_ITEM_WINDOW_DEFAULT_DEPTH,
            syncedAtMs: null,
          })
        );
        if (deps.getAuthContext().accessToken !== null) {
          context.enqueue(createAccountRefreshJob(deps, priority));
        }
        return;
      }
      const settings = await autoDownloadRepository.getByChannelIdText(window.channelIdText);
      if (settings?.enabled === true) {
        enqueueAutoDownloadEvaluateIfReady(context, priority, [window.channelIdText]);
      }
    },
    channelItemsTimeoutMs(window.depth)
  );
};

/**
 * The largest producer of work in the app: one job per subscribed channel that needs refreshing.
 *
 * Fanning out rather than looping is the point — the queue keeps them serial and the indicator's
 * total grows as they are discovered, instead of one opaque job holding the head of the queue for
 * as long as the subscription list is long.
 *
 * Add-by-RSS follows are skipped here. They are stored whole by `addByRssRepository` and refreshed
 * by their own jobs.
 */
const createChannelItemsScanJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('channel-items-scan', priority, 'channel-items-scan', async (context) => {
    const subscribed = await subscriptionsRepository.list();
    const channelIdTexts = subscribed
      .filter((channel) => channel.source === 'directory')
      .map((channel) => channel.idText);

    // Unsubscribing on another device, or browsing a channel and never following it, would
    // otherwise leave its items on disk indefinitely.
    await channelItemsRepository.retainChannels(channelIdTexts);

    // A pull gesture is somebody asking for fresh episodes on purpose, so it ignores the window
    // that keeps ordinary foreground transitions from re-fetching the whole library.
    const windows = await channelItemsRepository.selectStaleChannels(channelIdTexts, {
      staleAfterMs: priority === 'user' ? 0 : undefined,
    });

    context.enqueue(windows.map((window) => createChannelItemsJob(deps, priority, window)));
  });
};

const ADD_BY_RSS_LISTED_FEEDS_TIMEOUT_MS = 60000;

/**
 * A phone fetches and parses the whole feed itself, which takes longer than polling a server
 * result; the ceiling keeps one slow host from holding the serial queue.
 */
const ADD_BY_RSS_DEVICE_PARSE_TIMEOUT_MS = 60000;

/** Above the resolve run's 80 s budget, so a run that waits out a 429 still ends on its own. */
const ADD_BY_RSS_LISTED_RESOLVE_TIMEOUT_MS = 90000;

/** Where this session parses Add by RSS feeds. */
const readAddByRssParsePath = async (deps: SyncJobDeps): Promise<AddByRssParsePath> =>
  resolveAddByRssParsePath(await accountRepository.getSnapshot(), {
    isAuthenticated: deps.getAuthContext().accessToken !== null,
  });

/**
 * One run handles every album an Add by RSS artist lists that is still waiting on its parse, and
 * fills artwork for the directory albums it lists. It runs for every parse path. Signed in, it
 * polls the server's parses of all of them per round rather than one job per album, so albums
 * waiting on the server's background queue cannot hold the serial queue for minutes. Signed out,
 * this device fetches and parses the albums itself; a large artist finishes over several runs,
 * each queued by the one before while it still stores albums. Guid-only albums go on to the
 * resolve job.
 */
const createAddByRssListedFeedsJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob(
    'add-by-rss-listed-feeds',
    priority,
    'add-by-rss-listed-feeds',
    async (context) => {
      const parsePath = await readAddByRssParsePath(deps);
      const authContext = deps.getAuthContext();
      const { deviceAlbumsLeft, deviceAlbumsStored } = await addByRssRepository.runListedFeedWork(
        authContext,
        parsePath,
        sleep,
        context.abortController.signal
      );
      // A run that stored nothing does not queue another, so a host that keeps failing cannot loop.
      if (deviceAlbumsLeft > 0 && deviceAlbumsStored > 0) {
        context.enqueue(createAddByRssListedFeedsJob(deps, priority));
      }
      if (await addByRssRepository.hasListedFeedResolveWork(parsePath)) {
        context.enqueue(createAddByRssListedResolveJob(deps, priority));
      }
    },
    ADD_BY_RSS_LISTED_FEEDS_TIMEOUT_MS
  );
};

/**
 * Signed out, ask the public directory resolve about albums an Add by RSS artist names only by
 * feed guid: one paced call at a time, waiting out a 429. An album whose directory channel is not
 * ready yet is left for a later run once its retry time comes; nothing here waits for it. A run
 * that settled an answer queues the album job for new albums to parse and artwork to fill, and
 * queues itself again while guids are left.
 */
const createAddByRssListedResolveJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob(
    'add-by-rss-listed-resolve',
    priority,
    'add-by-rss-listed-resolve',
    async (context) => {
      const parsePath = await readAddByRssParsePath(deps);
      if (parsePath !== 'device') {
        return;
      }
      const authContext = deps.getAuthContext();
      const { applied, left } = await addByRssRepository.runListedFeedResolveWork(
        authContext,
        sleep,
        context.abortController.signal
      );
      if (applied === 0) {
        return;
      }
      if (await addByRssRepository.hasListedFeedWork(parsePath)) {
        context.enqueue(createAddByRssListedFeedsJob(deps, priority));
      }
      if (left > 0) {
        context.enqueue(createAddByRssListedResolveJob(deps, priority));
      }
    },
    ADD_BY_RSS_LISTED_RESOLVE_TIMEOUT_MS
  );
};

const createAddByRssParseJob = (
  deps: SyncJobDeps,
  priority: SyncJobPriority,
  ticket: AddByRssRefreshTicket
): SyncJob => {
  const job = buildJob(
    'add-by-rss-parse',
    priority,
    `add-by-rss-parse:${ticket.feedUrl}`,
    async (context) => {
      const account = await accountRepository.getSnapshot();
      await addByRssRepository.applyRefreshResult(
        deps.getAuthContext(),
        ticket,
        account?.id_text ?? null
      );
      if (await addByRssRepository.hasListedFeedWork(await readAddByRssParsePath(deps))) {
        context.enqueue(createAddByRssListedFeedsJob(deps, priority));
      }
      const settings = await autoDownloadRepository.getByChannelIdText(ticket.feedUrl);
      if (settings?.enabled === true) {
        enqueueAutoDownloadEvaluateIfReady(context, priority, [ticket.feedUrl]);
      }
    }
  );
  return {
    ...job,
    logDetails: { feed_url: ticket.feedUrl, request_id: ticket.requestId },
  };
};

const createAddByRssDeviceParseJob = (
  deps: SyncJobDeps,
  priority: SyncJobPriority,
  feedUrl: string
): SyncJob => {
  const job = buildJob(
    'add-by-rss-device-parse',
    priority,
    `add-by-rss-device-parse:${feedUrl}`,
    async (context) => {
      const authContext = deps.getAuthContext();
      // Queued signed out; someone signed in before it ran, and they never parse on the device.
      if (authContext.accessToken !== null) {
        return;
      }
      await addByRssRepository.refreshFeedOnDevice(authContext, feedUrl, {
        signal: context.abortController.signal,
      });
      if (await addByRssRepository.hasListedFeedWork(await readAddByRssParsePath(deps))) {
        context.enqueue(createAddByRssListedFeedsJob(deps, priority));
      }
      const settings = await autoDownloadRepository.getByChannelIdText(feedUrl);
      if (settings?.enabled === true) {
        enqueueAutoDownloadEvaluateIfReady(context, priority, [feedUrl]);
      }
    },
    ADD_BY_RSS_DEVICE_PARSE_TIMEOUT_MS
  );
  return { ...job, logDetails: { feed_url: feedUrl } };
};

/**
 * Keep followed add-by-RSS feeds current.
 *
 * Signed out, the phone fetches and parses each followed feed itself, one job per feed; a
 * background run skips feeds fetched in the last 15 minutes and a pull checks all of them. Album
 * work an artist left, including guid-only albums now due for a resolve, follows the parse jobs.
 *
 * Signed in, refreshing is server-side parsing and so membership-tier. Checking before asking is
 * what makes a lapsed membership *degrade* rather than fail: those feeds stay readable and playable
 * from what is already stored, and the device does not collect denials in the error log. A
 * signed-in session never parses on the phone. The first run after a login settles the phone's
 * feeds for that account first.
 */
const createAddByRssRefreshJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('add-by-rss-refresh', priority, 'add-by-rss-refresh', async (context) => {
    const authContext = deps.getAuthContext();
    if (authContext.accessToken === null) {
      const feedUrls = await addByRssRepository.listDeviceRefreshFeedUrls({
        nowMs: Date.now(),
        priority,
      });
      context.enqueue(
        feedUrls.map((feedUrl) => createAddByRssDeviceParseJob(deps, priority, feedUrl))
      );
      // Runs after the parse jobs, and picks up album work left when the app closed mid-run.
      const parsePath = await readAddByRssParsePath(deps);
      if (
        parsePath === 'device' &&
        ((await addByRssRepository.hasListedFeedWork(parsePath)) ||
          (await addByRssRepository.hasListedFeedResolveWork(parsePath)))
      ) {
        context.enqueue(createAddByRssListedFeedsJob(deps, priority));
      }
      return;
    }
    if (termsBlocksAccountSync()) {
      return;
    }

    const account = await accountRepository.getSnapshot();
    if (account === null) {
      return;
    }

    await runAddByRssLoginSettle(authContext, account);

    // Local only, and needed whatever the membership: credentials must not sit in a stored URL.
    await addByRssRepository.splitStoredUserinfo(account.id_text);

    const access = evaluateFeatureAccess('add_by_rss_refresh', deriveMembershipState(account));
    if (!access.allowed) {
      return;
    }

    const tickets = await addByRssRepository.requestRefreshAll(authContext, account.id_text);
    context.enqueue(tickets.map((ticket) => createAddByRssParseJob(deps, priority, ticket)));
  });
};

/**
 * Reconcile which channels have been opened, in both directions.
 *
 * Signed-in only: seen state is how a badge cleared on the phone stops showing on the web, and a
 * device with no account has nobody to reconcile with — its local rows are already the whole truth.
 *
 * It runs after the follows are settled rather than as a plan root, because reconciling seen state
 * for a channel the account no longer follows is work spent on a row about to be dropped.
 */
const createChannelSeenJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('channel-seen', priority, 'channel-seen', async () => {
    const subscribed = await subscriptionsRepository.list();
    await channelSeenRepository.retainSubscriptions(subscribed.map((channel) => channel.idText));

    await channelSeenRepository.syncWithAccount(deps.getAuthContext());
  });
};

/**
 * Refresh which subscribed channels are broadcasting.
 *
 * Nothing else can answer this from the device: live items are filtered out of every regular item
 * query, so the stored items for a channel never contain one. It is one request for the whole
 * subscription list rather than one per row, which is what makes the badge affordable at all.
 *
 * Signed-in only, because the endpoint answers for an account's follows. Add-by-RSS feeds are not
 * covered here and do not need to be — each one declares its own live items inside the bundle
 * already on disk, recorded when it is parsed.
 *
 * It runs after the follows are settled so the retention pass has the final list to compare
 * against, the same reason seen state does.
 */
const createChannelLiveStatusJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('channel-live-status', priority, 'channel-live-status', async () => {
    const subscribed = await subscriptionsRepository.list();
    await channelLiveStatusRepository.retainSubscriptions(
      subscribed.map((channel) => channel.idText)
    );

    await channelLiveStatusRepository.refreshFromAccount(deps.getAuthContext());
  });
};

const createLibraryBrowseProjectionJob = (
  priority: SyncJobPriority,
  scratch: SyncRunScratch
): SyncJob => {
  return buildJob('library-browse-projection', priority, 'library-browse-projection', async () => {
    await accountRepository.projectLibraryBrowse(scratch.playlistNodes);
  });
};

const createHomeClipsJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('home-clips', priority, 'home-clips', async () => {
    const clipsPrefs = await readHomeListPrefs('clips');
    await homeClipsCacheRepository.refreshFromAccount(
      deps.getAuthContext(),
      homeClipsQueryFromPrefs(clipsPrefs)
    );
  });
};

const createHomeLivestreamsJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('home-livestreams', priority, 'home-livestreams', async () => {
    await homeLivestreamsCacheRepository.refreshFromAccount(deps.getAuthContext());
  });
};

const createPopularityRanksJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('popularity-ranks', priority, 'popularity-ranks', async () => {
    const context = deps.getAuthContext();
    const podcastsPrefs = await readHomeListPrefs('podcasts');
    const episodesPrefs = await readHomeListPrefs('episodes');
    await subscriptionsRepository.refreshPopularityRanks(
      context,
      homeSortToApiRange(podcastsPrefs.sort, podcastsPrefs.range) ?? DEFAULT_HOME_RANGE
    );
    await channelItemsRepository.refreshPopularityRanks(
      context,
      homeSortToApiRange(episodesPrefs.sort, episodesPrefs.range) ?? DEFAULT_HOME_RANGE
    );
  });
};

const createSubscriptionsCommitJob = (
  deps: SyncJobDeps,
  priority: SyncJobPriority,
  scratch: SyncRunScratch
): SyncJob => {
  return buildJob('subscriptions-commit', priority, 'subscriptions-commit', async (context) => {
    await subscriptionsRepository.commitDirectoryHydration(scratch.directoryEntries);
    context.enqueue([
      createLibraryBrowseProjectionJob(priority, scratch),
      // Channels the account just introduced have nothing stored, so scan again now that the list
      // is settled rather than leaving them empty until the next trigger.
      createChannelItemsScanJob(deps, priority),
      createChannelSeenJob(deps, priority),
      createChannelLiveStatusJob(deps, priority),
      createPopularityRanksJob(deps, priority),
    ]);
  });
};

const createSubscriptionsPageJob = (
  deps: SyncJobDeps,
  priority: SyncJobPriority,
  scratch: SyncRunScratch,
  page: number
): SyncJob => {
  return buildJob('subscriptions-page', priority, `subscriptions-page:${page}`, async (context) => {
    if (scratch.subscriptionPages.has(page)) {
      throw new Error(`Directory subscription page repeated: ${page}`);
    }
    scratch.subscriptionPages.add(page);

    const { entries, nextPage } = await subscriptionsRepository.fetchDirectoryPage(
      deps.getAuthContext(),
      page
    );
    scratch.directoryEntries.push(...entries);

    // A page that throws never reaches this, so the commit job is never queued and the previous
    // rows survive. That is the intent: a half-walked account is not a smaller account.
    context.enqueue(
      nextPage === null
        ? createSubscriptionsCommitJob(deps, priority, scratch)
        : createSubscriptionsPageJob(deps, priority, scratch, nextPage)
    );
  });
};

const createAccountRefreshJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('account-refresh', priority, 'account-refresh', async (context) => {
    let account: DTOAccount;
    try {
      account = await accountRepository.refreshSnapshot(deps.getAuthContext(), {
        timeoutMs: context.timeoutMs,
      });
    } catch (error) {
      // A 401 that survives the refresh attempt means these credentials are definitively dead, and
      // nothing else is watching this request now that it no longer gates the splash. Ending the
      // session here raises the forced-logout notice, including the server's reason when the 401
      // carried one. Every other failure is left to the queue, which keeps an offline device
      // signed in.
      if (getErrorResponseStatus(error) === 401) {
        await deps
          .getAuthContext()
          .clearSession('session_expired', parseAuthSessionEndedError(error));
      }
      throw error;
    }

    deps.setAccount(account);

    // Local, and cheap: applying the account's locale and media-type preference needs no network,
    // so it stays inside this job instead of costing another slot in the queue.
    await reconcileAccountPrefsFromAccount(account);

    const scratch: SyncRunScratch = {
      directoryEntries: [],
      playlistNodes: [],
      subscriptionPages: new Set<number>(),
    };

    context.enqueue(
      buildJob('followed-playlists', priority, 'followed-playlists', async () => {
        scratch.playlistNodes = await accountRepository.fetchFollowedPlaylistNodes(
          account,
          deps.getAuthContext()
        );
      })
    );

    const followingChannels = account.account_following_channels ?? [];
    if (followingChannels.length === 0) {
      await subscriptionsRepository.clearDirectoryForEmptyAccount();
      context.enqueue([
        createLibraryBrowseProjectionJob(priority, scratch),
        createChannelItemsScanJob(deps, priority),
        createChannelSeenJob(deps, priority),
        createChannelLiveStatusJob(deps, priority),
        createPopularityRanksJob(deps, priority),
      ]);
      return;
    }

    context.enqueue(createSubscriptionsPageJob(deps, priority, scratch, 1));
  });
};

const createQueueHydrateJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('queue-hydrate', priority, 'queue-hydrate', async () => {
    await queueRepository.getAbridgedIndex(deps.getAuthContext());
    await deps.loadActiveQueue();
    publishQueueDataChanged();
  });
};

const createPlaybackReplayJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('playback-replay', priority, 'playback-replay', async () => {
    const account = await accountRepository.getSnapshot();
    if (account === null) {
      publishPlaybackReconcileConflicts([]);
      publishPlaybackPositionAdoptions([]);
      return;
    }

    const result = await playbackOutboxRepository.drainAndReconcile(
      deps.getAuthContext(),
      account.id_text,
      { isPlayingLocally: readIsPlayingLocallyForSync() }
    );
    publishPlaybackReconcileConflicts(result.resolveConflicts);
    publishPlaybackPositionAdoptions(result.adoptPositions);
    publishQueueDataChanged();
    await statsRepository.drainListens(deps.getAuthContext(), account.id_text);
  });
};

const createAutoDownloadRegistrationJob = (
  deps: SyncJobDeps,
  priority: SyncJobPriority
): SyncJob => {
  return buildJob(
    'auto-download-registration',
    priority,
    'auto-download-registration',
    async () => {
      const account = await accountRepository.getSnapshot();
      if (account === null) {
        return;
      }
      await runAutoDownloadRegistration({ auth: deps.getAuthContext() });
    }
  );
};

const createPushRegistrationJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('push-device-registration', priority, 'push-device-registration', async () => {
    const account = await accountRepository.getSnapshot();
    if (account === null) {
      return;
    }
    await registerPushDeviceForAccount({
      account,
      auth: deps.getAuthContext(),
    });
  });
};

const createIdentityRemapJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('identity-remap', priority, 'identity-remap', async (context) => {
    const result = await identityRemapRepository.runScheduled({
      ignoreWatermark: priority === 'user',
    });
    if (result.moved && deps.getAuthContext().accessToken !== null) {
      context.enqueue(createAccountRefreshJob(deps, priority));
    }
  });
};

/** Turn the planned roots into runnable jobs. Discovered work is queued by the job that finds it. */
export const buildSyncJobs = (planned: PlannedSyncJob[], deps: SyncJobDeps): SyncJob[] => {
  return planned.map(({ kind, priority }) => {
    switch (kind) {
      case 'account-refresh':
        return createAccountRefreshJob(deps, priority);
      case 'playback-replay':
        return createPlaybackReplayJob(deps, priority);
      case 'queue-hydrate':
        return createQueueHydrateJob(deps, priority);
      case 'push-device-registration':
        return createPushRegistrationJob(deps, priority);
      case 'auto-download-registration':
        return createAutoDownloadRegistrationJob(deps, priority);
      case 'channel-items-scan':
        return createChannelItemsScanJob(deps, priority);
      case 'identity-remap':
        return createIdentityRemapJob(deps, priority);
      case 'add-by-rss-refresh':
        return createAddByRssRefreshJob(deps, priority);
      case 'add-by-rss-listed-feeds':
        return createAddByRssListedFeedsJob(deps, priority);
      case 'home-clips':
        return createHomeClipsJob(deps, priority);
      case 'home-livestreams':
        return createHomeLivestreamsJob(deps, priority);
      case 'auto-download-evaluate':
        return createAutoDownloadEvaluateJob(priority);
      default:
        // The remaining kinds are only ever reached through the job that discovers them, so a plan
        // asking for one directly is a programming error rather than a runtime condition.
        throw new Error(`Sync job kind "${kind}" is not schedulable as a plan root`);
    }
  });
};
