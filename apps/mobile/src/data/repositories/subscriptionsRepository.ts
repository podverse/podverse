import { eq, isNotNull } from 'drizzle-orm';

import type { QueryParamsStatsRange } from '@podverse/helpers-requests';

// Import directly from the request module (not the auth barrel) to avoid a cycle, mirroring
// accountRepository (AuthProvider → accountRepository → auth barrel → AuthProvider).
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import {
  hydrateChannelActionChrome,
  snapshotPersistedChannelActionChrome,
} from '../../lib/channelActionChrome';
import { getDb, initializeDatabase, schema } from '../db';
import type { SubscribedChannelRow } from '../db/schema';
import { addByRssRepository } from './addByRssRepository';
import { autoDownloadRepository } from './autoDownloadRepository';
import { rememberChannelSubscribed } from './channelActionChromeRepository';
import { channelItemsRepository } from './channelItemsRepository';
import { channelLiveStatusRepository } from './channelLiveStatusRepository';
import { channelSeenRepository } from './channelSeenRepository';
import type {
  SubscribedChannel,
  SubscriptionChannelKind,
  SubscriptionFilter,
  SubscriptionMedium,
  SubscriptionSort,
  SubscriptionSource,
} from './subscriptionsMerge';
import {
  applySubscriptionChannelKind,
  applySubscriptionFilter,
  isSubscriptionChannelKind,
  mapAddByRssToSubscribed,
  mapDirectoryChannelToSubscribed,
  mergeSubscriptions,
  sortSubscriptions,
} from './subscriptionsMerge';
import { getNextDirectoryPage } from './subscriptionsPagination';
import { hasPendingSignupMerge } from './subscriptionsSignupMarker';
import type { MobileAuthRequestContext } from './types';

export type {
  SubscribedChannel,
  SubscriptionChannelKind,
  SubscriptionFilter,
  SubscriptionMedium,
  SubscriptionSort,
  SubscriptionSource,
} from './subscriptionsMerge';
export {
  isSubscriptionChannelKind,
  mediumFromSubscriptionChannelKind,
  subscriptionChannelKindFromMediumId,
  subscriptionChannelKindFromResourceType,
  SUBSCRIPTION_CHANNEL_KINDS,
} from './subscriptionsMerge';

const isSubscriptionSource = (value: string): value is SubscriptionSource => {
  return value === 'directory' || value === 'addByRss';
};

const isSubscriptionMedium = (value: string): value is SubscriptionMedium => {
  return value === 'podcasts' || value === 'music';
};

/** Window the stored listen-count ranks were stamped for. Null until a walk in this process. */
let appliedPopularityRange: QueryParamsStatsRange | null = null;

const rowToSubscribed = (row: SubscribedChannelRow): SubscribedChannel => {
  const kind = isSubscriptionChannelKind(row.kind) ? row.kind : 'podcasts';
  return {
    idText: row.idText,
    sourceIdText: row.idText,
    title: row.title,
    imageUrl: row.imageUrl,
    source: isSubscriptionSource(row.source) ? row.source : 'directory',
    medium: isSubscriptionMedium(row.medium) ? row.medium : 'podcasts',
    kind,
    latestItemPubDateMs: null,
    popularityRank: row.popularityRank,
  };
};

const readDirectoryCache = async (): Promise<SubscribedChannel[]> => {
  const rows = await getDb().select().from(schema.subscribedChannel);
  return rows.map(rowToSubscribed);
};

/** Replace the whole directory cache with the freshly hydrated set in one transaction. */
const replaceDirectoryCache = async (entries: SubscribedChannel[]): Promise<void> => {
  const updatedAt = Date.now();
  await getDb().transaction(async (transaction) => {
    await transaction.delete(schema.subscribedChannel);
    if (entries.length === 0) {
      return;
    }
    await transaction.insert(schema.subscribedChannel).values(
      entries.map((entry) => ({
        idText: entry.idText,
        title: entry.title,
        imageUrl: entry.imageUrl,
        source: entry.source,
        medium: entry.medium,
        kind: entry.kind,
        popularityRank: entry.popularityRank,
        updatedAt,
      }))
    );
  });
  hydrateChannelActionChrome({
    persisted: snapshotPersistedChannelActionChrome(),
    subscribedIdTexts: entries.map((entry) => entry.idText),
  });
};

/** Add or refresh entries without removing anything already present. */
const upsertDirectoryEntries = async (entries: SubscribedChannel[]): Promise<void> => {
  for (const entry of entries) {
    await subscriptionsRepository.subscribeLocal(entry);
  }
};

/** One page of directory follows, plus where the walk goes next. */
export type DirectoryPageResult = {
  entries: SubscribedChannel[];
  /** `null` when this was the last page. */
  nextPage: number | null;
};

/**
 * Unified subscriptions repository — the single source of truth for "channels I follow".
 * Merges directory follows (`subscribed_channel`) with add-by-RSS follows (`addByRssRepository`)
 * into one deduped, sorted, filterable list, offline-first and **correct while signed out**.
 * Consumed by Home, My Library, and the car library-browse projection. All
 * follows-related API calls stay here (never in screens); see the mobile-data-layer skill.
 *
 * Ownership of the directory rows depends on auth state:
 * - **Signed out** — local writes are the truth. `subscribeLocal` / `unsubscribeLocal` are the whole
 *   operation; nothing reaches the server.
 * - **Signed in** — the account is the truth. A queued directory walk replaces the rows, and callers
 *   push the follow to the server themselves (membership-gated) before writing locally.
 *
 * Local subscriptions cross over to an account **only** through the sign-up merge
 * (`signupMerge.ts`); a later sign-in never pushes them up.
 */
export const subscriptionsRepository = {
  /** Merged directory + add-by-RSS follows (default: all, alphabetical). Offline-capable. */
  list: async (
    params: {
      filter?: SubscriptionFilter;
      kind?: SubscriptionChannelKind | null;
      sort?: SubscriptionSort;
    } = {}
  ): Promise<SubscribedChannel[]> => {
    await initializeDatabase();
    const { filter = 'all', kind = null, sort = 'alphabetical' } = params;

    // The publish dates come from the item store for directory channels and from a column on the
    // feed row for add-by-RSS, so both are read here and attached before the two sets are merged.
    // Always read, not only when ordering by recency: a subscription row states when its channel
    // last published, so the date is part of the answer whichever order it comes back in.
    const [addByRssRecords, directory, latestPubDateByChannel] = await Promise.all([
      addByRssRepository.listFeeds(),
      readDirectoryCache(),
      channelItemsRepository.latestPubDateByChannel(),
    ]);

    const addByRss: SubscribedChannel[] = [];
    for (const record of addByRssRecords) {
      const mapped = mapAddByRssToSubscribed(record);
      if (mapped !== null) {
        addByRss.push(mapped);
      }
    }

    const directoryWithRecency = directory.map((entry) => ({
      ...entry,
      latestItemPubDateMs: latestPubDateByChannel.get(entry.idText) ?? null,
      popularityRank: entry.popularityRank,
    }));

    const merged = mergeSubscriptions(directoryWithRecency, addByRss);
    return sortSubscriptions(
      applySubscriptionChannelKind(applySubscriptionFilter(merged, filter), kind),
      sort
    );
  },

  /** Whether this channel is shown as subscribed on this device. */
  isSubscribed: async (idText: string): Promise<boolean> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ idText: schema.subscribedChannel.idText })
      .from(schema.subscribedChannel)
      .where(eq(schema.subscribedChannel.idText, idText))
      .limit(1);
    return rows.length > 0;
  },

  /**
   * Local directory subscription chrome (title + list image) for a single channel, or null when
   * this device does not follow it. Used to paint Podcast Detail before the network DTO arrives.
   */
  getByIdText: async (idText: string): Promise<SubscribedChannel | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.subscribedChannel)
      .where(eq(schema.subscribedChannel.idText, idText))
      .limit(1);
    const row = rows[0];
    return row === undefined ? null : rowToSubscribed(row);
  },

  /**
   * Record a directory subscription locally. Safe to call repeatedly — the row is upserted, so a
   * re-subscribe refreshes the display fields rather than failing on the primary key.
   *
   * Signed out this is the entire operation. Signed in, callers push the follow to the server first
   * so a membership denial never leaves a local row the account does not have.
   */
  subscribeLocal: async (entry: SubscribedChannel): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .insert(schema.subscribedChannel)
      .values({
        idText: entry.idText,
        title: entry.title,
        imageUrl: entry.imageUrl,
        source: entry.source,
        medium: entry.medium,
        kind: entry.kind,
        popularityRank: entry.popularityRank,
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: schema.subscribedChannel.idText,
        set: {
          title: entry.title,
          imageUrl: entry.imageUrl,
          medium: entry.medium,
          kind: entry.kind,
          updatedAt: Date.now(),
        },
      });
    rememberChannelSubscribed(entry.idText, true);
    void autoDownloadRepository
      .seedFromGlobalDefaults({
        channelIdText: entry.idText,
        source: entry.source === 'addByRss' ? 'add_by_rss' : 'directory',
      })
      .catch(() => {
        // Seeding is best-effort; the user can toggle podcast settings later.
      });
  },

  /** Remove a directory subscription locally. Never gated — unsubscribe works in every state. */
  unsubscribeLocal: async (idText: string): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .delete(schema.subscribedChannel)
      .where(eq(schema.subscribedChannel.idText, idText));
    // Drop the stored episodes with the follow rather than waiting for the next reconciliation
    // pass, so an unfollowed channel leaves the episode lists as soon as the user asks it to.
    await channelItemsRepository.removeChannel(idText);
    // Seen state has no meaning without a follow, and keeping it would make a re-follow open with a
    // badge answering a question about a subscription the user already ended.
    await channelSeenRepository.remove(idText);
    await channelLiveStatusRepository.remove(idText);
    await autoDownloadRepository.removeChannel(idText);
    rememberChannelSubscribed(idText, false);
  },

  /**
   * End a follow. The local write always happens first and stands even if the account call fails.
   *
   * `accountSync` is the signed-in path: directory unfollows `channel_id_text`, add-by-RSS unfollows
   * the feed URL. Omit it when signed out — local removal is the whole operation.
   */
  unsubscribe: async (params: {
    accountSync?: MobileAuthRequestContext;
    idText: string;
    source: SubscriptionSource;
  }): Promise<{ serverError: boolean }> => {
    if (params.source === 'addByRss') {
      await addByRssRepository.removeFeed(params.idText);
    } else {
      await subscriptionsRepository.unsubscribeLocal(params.idText);
    }

    if (params.accountSync === undefined) {
      return { serverError: false };
    }

    try {
      await requestWithMobileAuthRefresh(params.accountSync, async (api) => {
        if (params.source === 'addByRss') {
          return api.reqAccountUnfollowAddByRSSChannel({
            feed_url: params.idText,
          });
        }
        return api.reqAccountUnfollowChannel({ channel_id_text: params.idText });
      });
      return { serverError: false };
    } catch {
      return { serverError: true };
    }
  },

  /**
   * Channel `id_text`s of the local directory follows, for the sign-up merge. Add-by-RSS feeds are
   * excluded — they are followed through their own endpoint, not by channel id.
   */
  listDirectoryIdTexts: async (): Promise<string[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ idText: schema.subscribedChannel.idText })
      .from(schema.subscribedChannel);
    return rows.map((row) => row.idText);
  },

  /**
   * Fetch one page of the account's directory follows.
   *
   * The subscribed list endpoint returns exactly those follows with display fields (id_text, title,
   * images) — the numeric ids in `account_following_channels` hydrated.
   *
   * A page at a time rather than a loop: these rows decide whether a channel reads as subscribed,
   * so the walk must reach the end. The caller drives the pages the result points at.
   */
  fetchDirectoryPage: async (
    context: MobileAuthRequestContext,
    page: number
  ): Promise<DirectoryPageResult> => {
    const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.reqChannelGetMany({
        category: null,
        // Every followed channel kind (podcasts, artists, albums) so Home music chips can list
        // account follows the same way Podcasts lists podcast follows.
        medium: 'all',
        page,
        range: null,
        sort: 'a_z',
        type: 'subscribed',
      })
    );

    const entries: SubscribedChannel[] = [];
    for (const channel of response.data) {
      const mapped = mapDirectoryChannelToSubscribed(channel);
      if (mapped !== null) {
        entries.push(mapped);
      }
    }

    const responsePage = response.meta.page === null ? page : response.meta.page;
    const nextPage = getNextDirectoryPage({
      itemCount: response.data.length,
      limit: response.meta.limit,
      requestedPage: page,
      responsePage,
      totalCount: response.meta.count,
    });

    return { entries, nextPage };
  },

  /**
   * Adopt a completed directory walk as the local truth, because while signed in the account is the
   * source of truth.
   *
   * Only call this with the **whole** set. Replacement is all-or-nothing by design: committing a
   * partial walk would delete every follow the pages that failed would have carried, so an
   * interrupted sync leaves the previous rows in place and waits for the next trigger.
   *
   * A sign-up merge that has not landed yet is the one exception. Those local rows still owe
   * themselves to the account, and letting the account overwrite them here would delete exactly the
   * subscriptions the merge is about to push, so the account is additive until it lands.
   */
  commitDirectoryHydration: async (entries: SubscribedChannel[]): Promise<void> => {
    await initializeDatabase();

    if (await hasPendingSignupMerge()) {
      await upsertDirectoryEntries(entries);
      return;
    }

    const previousRanks = new Map(
      (await readDirectoryCache()).map((entry) => [entry.idText, entry.popularityRank])
    );
    const entriesWithRanks = entries.map((entry) => ({
      ...entry,
      popularityRank: entry.popularityRank ?? previousRanks.get(entry.idText) ?? null,
    }));

    await replaceDirectoryCache(entriesWithRanks);
  },

  /**
   * Whether any directory follow already has a listen-count rank stored for this window.
   *
   * A range that differs from the last walk is treated as missing so Home can stamp the new
   * window instead of reordering from ranks that belong to another one.
   */
  hasPopularityRanks: async (range?: QueryParamsStatsRange): Promise<boolean> => {
    if (range !== undefined && appliedPopularityRange !== range) {
      return false;
    }
    await initializeDatabase();
    const rows = await getDb()
      .select({ idText: schema.subscribedChannel.idText })
      .from(schema.subscribedChannel)
      .where(isNotNull(schema.subscribedChannel.popularityRank))
      .limit(1);
    return rows.length > 0;
  },

  /**
   * Replace stored listen-count ranks from the account's subscribed popularity list.
   *
   * The walk is the rank: position 0 is the most listened follow in the requested window. Channels
   * the endpoint does not return keep a null rank and sort after those that have one.
   */
  refreshPopularityRanks: async (
    context: MobileAuthRequestContext,
    range: QueryParamsStatsRange = 'week'
  ): Promise<void> => {
    const rankedIdTexts: string[] = [];
    let page = 1;

    for (;;) {
      const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
        apiRequestService.reqChannelGetMany({
          category: null,
          medium: 'podcasts',
          page,
          range,
          sort: 'top',
          type: 'subscribed',
        })
      );

      for (const channel of response.data) {
        const idText = channel.id_text.trim();
        if (idText.length > 0) {
          rankedIdTexts.push(idText);
        }
      }

      const responsePage = response.meta.page === null ? page : response.meta.page;
      const nextPage = getNextDirectoryPage({
        itemCount: response.data.length,
        limit: response.meta.limit,
        requestedPage: page,
        responsePage,
        totalCount: response.meta.count,
      });
      if (nextPage === null) {
        break;
      }
      page = nextPage;
    }

    await initializeDatabase();
    await getDb().transaction(async (transaction) => {
      await transaction.update(schema.subscribedChannel).set({ popularityRank: null });
      for (const [index, idText] of rankedIdTexts.entries()) {
        await transaction
          .update(schema.subscribedChannel)
          .set({ popularityRank: index })
          .where(eq(schema.subscribedChannel.idText, idText));
      }
    });
    appliedPopularityRange = range;
  },

  /**
   * Drop the directory follows for an account that has none, so unfollowing on another device is
   * reflected here. Held back while a sign-up merge is outstanding, for the same reason
   * `commitDirectoryHydration` holds back replacement.
   */
  clearDirectoryForEmptyAccount: async (): Promise<void> => {
    await initializeDatabase();
    if (await hasPendingSignupMerge()) {
      return;
    }
    await replaceDirectoryCache([]);
  },

  /**
   * Drop every local directory follow, for explicit resets: E2E fixtures and account deletion.
   *
   * Signing out is not one of them — a signed-out device keeps its subscriptions.
   */
  clearCache: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.subscribedChannel);
    await channelItemsRepository.clear();
    await channelSeenRepository.clear();
    await channelLiveStatusRepository.clear();
  },
};
