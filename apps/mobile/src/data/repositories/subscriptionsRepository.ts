import type { DTOAccount } from '@podverse/helpers/dto';

// Import directly from the request module (not the auth barrel) to avoid a cycle, mirroring
// accountRepository (AuthProvider → accountRepository → auth barrel → AuthProvider).
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { getDb, initializeDatabase, schema } from '../db';
import type { SubscribedChannelRow } from '../db/schema';
import { addByRssRepository } from './addByRssRepository';
import type {
  SubscribedChannel,
  SubscriptionFilter,
  SubscriptionMedium,
  SubscriptionSort,
  SubscriptionSource,
} from './subscriptionsMerge';
import {
  applySubscriptionFilter,
  mapAddByRssToSubscribed,
  mapDirectoryChannelToSubscribed,
  mergeSubscriptions,
  sortSubscriptions,
} from './subscriptionsMerge';
import type { MobileAuthRequestContext } from './types';

export type {
  SubscribedChannel,
  SubscriptionFilter,
  SubscriptionMedium,
  SubscriptionSort,
  SubscriptionSource,
} from './subscriptionsMerge';

const isSubscriptionSource = (value: string): value is SubscriptionSource => {
  return value === 'directory' || value === 'addByRss';
};

const isSubscriptionMedium = (value: string): value is SubscriptionMedium => {
  return value === 'podcasts' || value === 'music';
};

const rowToSubscribed = (row: SubscribedChannelRow): SubscribedChannel => {
  return {
    idText: row.idText,
    title: row.title,
    imageUrl: row.imageUrl,
    source: isSubscriptionSource(row.source) ? row.source : 'directory',
    medium: isSubscriptionMedium(row.medium) ? row.medium : 'podcasts',
  };
};

const readDirectoryCache = async (): Promise<SubscribedChannel[]> => {
  const rows = await getDb().select().from(schema.subscribedChannel);
  return rows.map(rowToSubscribed);
};

/** Replace the whole directory cache with the freshly hydrated set (delete-all then insert). */
const replaceDirectoryCache = async (entries: SubscribedChannel[]): Promise<void> => {
  const updatedAt = Date.now();
  await getDb().delete(schema.subscribedChannel);
  if (entries.length === 0) {
    return;
  }
  await getDb()
    .insert(schema.subscribedChannel)
    .values(
      entries.map((entry) => ({
        idText: entry.idText,
        title: entry.title,
        imageUrl: entry.imageUrl,
        source: entry.source,
        medium: entry.medium,
        updatedAt,
      }))
    );
};

const hydrateDirectoryChannels = async (
  context: MobileAuthRequestContext
): Promise<SubscribedChannel[]> => {
  // The subscribed list endpoint returns exactly the account's directory follows with display
  // fields (id_text, title, images) — the numeric ids in account_following_channels hydrated.
  const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
    apiRequestService.reqChannelGetMany({
      category: null,
      medium: 'podcasts',
      page: 1,
      range: null,
      sort: 'a_z',
      type: 'subscribed',
    })
  );

  const hydrated: SubscribedChannel[] = [];
  for (const channel of response.data) {
    const mapped = mapDirectoryChannelToSubscribed(channel);
    if (mapped !== null) {
      hydrated.push(mapped);
    }
  }
  return hydrated;
};

/**
 * Unified subscriptions repository (9b.8) — the single source of truth for "channels I follow".
 * Merges directory follows (hydrated + cached in `subscribed_channel`) with add-by-RSS follows
 * (from `addByRssRepository`) into one deduped, sorted, filterable list, offline-first. Consumed by
 * Home (8.16), My Library (9.30), and the car library-browse projection (12.22). All follows-related
 * API calls stay here (never in screens); see the mobile-data-layer skill.
 * Detail: docs/proposals/mobile/_master-plan_/phase-1/details/600-unified-subscriptions-repository.md
 */
export const subscriptionsRepository = {
  /** Merged directory + add-by-RSS follows (default: all, alphabetical). Offline-capable. */
  list: async (
    params: { filter?: SubscriptionFilter; sort?: SubscriptionSort } = {}
  ): Promise<SubscribedChannel[]> => {
    await initializeDatabase();
    const { filter = 'all', sort = 'alphabetical' } = params;

    const [addByRssRecords, directory] = await Promise.all([
      addByRssRepository.listFeeds(),
      readDirectoryCache(),
    ]);

    const addByRss: SubscribedChannel[] = [];
    for (const record of addByRssRecords) {
      const mapped = mapAddByRssToSubscribed(record);
      if (mapped !== null) {
        addByRss.push(mapped);
      }
    }

    const merged = mergeSubscriptions(directory, addByRss);
    return sortSubscriptions(applySubscriptionFilter(merged, filter), sort);
  },

  /**
   * Refresh the directory follows cache from the account. Best-effort and **soft-fail**: on a
   * hydration error the previous cache is left intact for offline reads and no error propagates
   * (must never break the account snapshot write in accountRepository.refresh). When the account has
   * no directory follows, the cache is cleared.
   */
  syncFromAccount: async (
    account: DTOAccount,
    context: MobileAuthRequestContext
  ): Promise<void> => {
    await initializeDatabase();
    const followingChannels = account.account_following_channels ?? [];

    if (followingChannels.length === 0) {
      await replaceDirectoryCache([]);
      return;
    }

    try {
      const hydrated = await hydrateDirectoryChannels(context);
      await replaceDirectoryCache(hydrated);
    } catch (error) {
      console.warn('[subscriptions] directory hydration failed (soft-fail)', error);
    }
  },

  /** Clear the directory follows cache (logout / session reset). */
  clearCache: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.subscribedChannel);
  },
};
