import { eq } from 'drizzle-orm';

import type { DTOAccount } from '@podverse/helpers/dto';
import { getTotalPages } from '@podverse/helpers/pagination';

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

/**
 * Ceiling on pages walked during a sync, so a malformed `meta` can never spin forever. At the
 * endpoint's page size this covers far more subscriptions than any real account has.
 */
const MAX_SYNC_PAGES = 25;

/** Add or refresh entries without removing anything already present. */
const upsertDirectoryEntries = async (entries: SubscribedChannel[]): Promise<void> => {
  for (const entry of entries) {
    await subscriptionsRepository.subscribeLocal(entry);
  }
};

const hydrateDirectoryChannels = async (
  context: MobileAuthRequestContext
): Promise<SubscribedChannel[]> => {
  // The subscribed list endpoint returns exactly the account's directory follows with display
  // fields (id_text, title, images) — the numeric ids in account_following_channels hydrated.
  //
  // Paged through to the end rather than taking page 1: these rows decide whether a channel shows
  // as subscribed, so stopping at the first page would make everything past it look unsubscribed.
  const hydrated: SubscribedChannel[] = [];
  let page = 1;

  while (page <= MAX_SYNC_PAGES) {
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

    for (const channel of response.data) {
      const mapped = mapDirectoryChannelToSubscribed(channel);
      if (mapped !== null) {
        hydrated.push(mapped);
      }
    }

    const responsePage = response.meta.page ?? page;
    const totalPages = getTotalPages(
      response.meta.count,
      response.meta.limit,
      response.data.length,
      responsePage
    );
    if (response.meta.limit <= 0 || responsePage >= totalPages) {
      break;
    }
    page = responsePage + 1;
  }

  return hydrated;
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
 * - **Signed in** — the account is the truth. `syncFromAccount` replaces the rows on every refresh,
 *   and callers push the follow to the server themselves (membership-gated) before writing locally.
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
   * Replace the directory follows with the account's, because while signed in the account is the
   * source of truth. Best-effort and **soft-fail**: on a hydration error the existing rows are left
   * intact for offline reads and no error propagates (must never break the account snapshot write in
   * accountRepository.refresh). When the account has no directory follows, the rows are cleared.
   */
  syncFromAccount: async (
    account: DTOAccount,
    context: MobileAuthRequestContext
  ): Promise<void> => {
    await initializeDatabase();
    const followingChannels = account.account_following_channels ?? [];

    // A sign-up merge that has not landed yet means these local rows still need to go up. Letting
    // the account overwrite them here would delete exactly the subscriptions the merge owes, so
    // while one is outstanding the account is additive instead of authoritative.
    const mergePending = await hasPendingSignupMerge();

    if (followingChannels.length === 0) {
      if (!mergePending) {
        await replaceDirectoryCache([]);
      }
      return;
    }

    try {
      const hydrated = await hydrateDirectoryChannels(context);
      if (mergePending) {
        await upsertDirectoryEntries(hydrated);
        return;
      }
      await replaceDirectoryCache(hydrated);
    } catch (error) {
      console.warn('[subscriptions] directory hydration failed (soft-fail)', error);
    }
  },

  /**
   * Drop every local directory follow, for explicit resets: E2E fixtures and account deletion.
   *
   * Signing out is not one of them — a signed-out device keeps its subscriptions.
   */
  clearCache: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.subscribedChannel);
  },
};
