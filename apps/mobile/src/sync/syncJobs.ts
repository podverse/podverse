import { deriveMembershipState, evaluateFeatureAccess } from '@podverse/helpers';
import type { DTOAccount } from '@podverse/helpers/dto';
import { getErrorResponseStatus } from '@podverse/helpers/error';

import {
  reconcileAccountPrefsFromAccount,
  registerPushDeviceForAccount,
} from '../auth/syncAccountPrefs';
import type { NativeCacheBrowseNode } from '../data/nativeCache';
import { accountRepository } from '../data/repositories/accountRepository';
import type { AddByRssRefreshTicket } from '../data/repositories/addByRssRepository';
import { addByRssRepository } from '../data/repositories/addByRssRepository';
import { channelItemsRepository } from '../data/repositories/channelItemsRepository';
import type { ChannelItemWindow } from '../data/repositories/channelItemWindow';
import { channelLiveStatusRepository } from '../data/repositories/channelLiveStatusRepository';
import { channelSeenRepository } from '../data/repositories/channelSeenRepository';
import { queueRepository } from '../data/repositories/queueRepository';
import type { SubscribedChannel } from '../data/repositories/subscriptionsRepository';
import { subscriptionsRepository } from '../data/repositories/subscriptionsRepository';
import type { MobileAuthRequestContext } from '../data/repositories/types';
import type { SyncJobKind } from './syncJobKinds';
import { SYNC_JOB_LABEL_KEYS } from './syncJobKinds';
import type { PlannedSyncJob } from './syncJobPlan';
import type { SyncJob, SyncJobPriority } from './syncQueue';
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

const createChannelItemsJob = (
  deps: SyncJobDeps,
  priority: SyncJobPriority,
  window: ChannelItemWindow
): SyncJob => {
  return buildJob(
    'channel-items',
    priority,
    `channel-items:${window.channelIdText}`,
    async () => {
      await channelItemsRepository.syncChannel(deps.getAuthContext(), window.channelIdText);
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

const createAddByRssParseJob = (
  deps: SyncJobDeps,
  priority: SyncJobPriority,
  ticket: AddByRssRefreshTicket
): SyncJob => {
  return buildJob('add-by-rss-parse', priority, `add-by-rss-parse:${ticket.feedUrl}`, async () => {
    await addByRssRepository.applyRefreshResult(deps.getAuthContext(), ticket);
  });
};

/**
 * Keep followed add-by-RSS feeds current.
 *
 * Refreshing a feed is server-side parsing work, so it is membership-tier. Checking before asking
 * is what makes a lapsed membership *degrade* rather than fail: those feeds stay readable and
 * playable from what is already stored, and the device does not spend every foreground transition
 * collecting denials in the sync event log.
 */
const createAddByRssRefreshJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('add-by-rss-refresh', priority, 'add-by-rss-refresh', async (context) => {
    const account = await accountRepository.getSnapshot();
    if (account === null) {
      return;
    }

    const access = evaluateFeatureAccess('add_by_rss_refresh', deriveMembershipState(account));
    if (!access.allowed) {
      return;
    }

    const tickets = await addByRssRepository.requestRefreshAll(deps.getAuthContext());
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
      // session here is what raises the forced-logout notice. Every other failure is left to the
      // queue, which keeps an offline device signed in.
      if (getErrorResponseStatus(error) === 401) {
        await deps.getAuthContext().clearSession('session_expired');
      }
      throw error;
    }

    deps.setAccount(account);

    // Local, and cheap: applying the account's locale and media-type preference needs no network,
    // so it stays inside this job instead of costing another slot in the queue.
    await reconcileAccountPrefsFromAccount(account);

    const scratch: SyncRunScratch = { directoryEntries: [], playlistNodes: [] };

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
  });
};

const createPushRegistrationJob = (deps: SyncJobDeps, priority: SyncJobPriority): SyncJob => {
  return buildJob('push-device-registration', priority, 'push-device-registration', async () => {
    const account = await accountRepository.getSnapshot();
    if (account === null) {
      return;
    }
    await registerPushDeviceForAccount({
      accessToken: deps.getAuthContext().accessToken,
      account,
    });
  });
};

/** Turn the planned roots into runnable jobs. Discovered work is queued by the job that finds it. */
export const buildSyncJobs = (planned: PlannedSyncJob[], deps: SyncJobDeps): SyncJob[] => {
  return planned.map(({ kind, priority }) => {
    switch (kind) {
      case 'account-refresh':
        return createAccountRefreshJob(deps, priority);
      case 'queue-hydrate':
        return createQueueHydrateJob(deps, priority);
      case 'push-device-registration':
        return createPushRegistrationJob(deps, priority);
      case 'channel-items-scan':
        return createChannelItemsScanJob(deps, priority);
      case 'add-by-rss-refresh':
        return createAddByRssRefreshJob(deps, priority);
      default:
        // The remaining kinds are only ever reached through the job that discovers them, so a plan
        // asking for one directly is a programming error rather than a runtime condition.
        throw new Error(`Sync job kind "${kind}" is not schedulable as a plan root`);
    }
  });
};
