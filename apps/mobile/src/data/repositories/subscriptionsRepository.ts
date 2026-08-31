import { eq } from 'drizzle-orm';

// Import directly from the request module (not the auth barrel) to avoid a cycle, mirroring
// accountRepository (AuthProvider → accountRepository → auth barrel → AuthProvider).
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { getDb, initializeDatabase, schema } from '../db';
import type { SubscribedChannelRow } from '../db/schema';
import { addByRssRepository } from './addByRssRepository';
import { channelItemsRepository } from './channelItemsRepository';
import { channelLiveStatusRepository } from './channelLiveStatusRepository';
import { channelSeenRepository } from './channelSeenRepository';
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
import { getNextDirectoryPage } from './subscriptionsPagination';
import { hasPendingSignupMerge } from './subscriptionsSignupMarker';
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
    sourceIdText: row.idText,
    title: row.title,
    imageUrl: row.imageUrl,
    source: isSubscriptionSource(row.source) ? row.source : 'directory',
    medium: isSubscriptionMedium(row.medium) ? row.medium : 'podcasts',
    latestItemPubDateMs: null,
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
    await transaction
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
    params: { filter?: SubscriptionFilter; sort?: SubscriptionSort } = {}
  ): Promise<SubscribedChannel[]> => {
    await initializeDatabase();
    const { filter = 'all', sort = 'alphabetical' } = params;

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
    }));

    const merged = mergeSubscriptions(directoryWithRecency, addByRss);
    return sortSubscriptions(applySubscriptionFilter(merged, filter), sort);
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
        updatedAt: Date.now(),
      })
      .onConflictDoUpdate({
        target: schema.subscribedChannel.idText,
        set: {
          title: entry.title,
          imageUrl: entry.imageUrl,
          medium: entry.medium,
          updatedAt: Date.now(),
        },
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
        medium: 'podcasts',
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

    await replaceDirectoryCache(entries);
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
