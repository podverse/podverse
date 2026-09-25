import { desc, eq, isNotNull } from 'drizzle-orm';

import type { AddByRSSParseCacheEntry } from '@podverse/helpers';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

// Import directly from the request module (not the auth barrel) to avoid a cycle, mirroring
// accountRepository (AuthProvider → accountRepository → auth barrel → AuthProvider).
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { buildAddByRssParseFailureLog } from '../../lib/addByRss/addByRssErrorLog';
import type {
  AddByRssCredentialStatus,
  AddByRssCredentials,
  AddByRssNeedsCredentialsFeed,
} from '../../lib/addByRss/credentials';
import {
  isAddByRssAuthFailure,
  partitionAddByRssFeedsByCredentials,
  resolveAddByRssCredentialStatus,
  splitAddByRssPastedUrl,
  toAddByRssCredentialFeedUrl,
} from '../../lib/addByRss/credentials';
import type { AddByRssPollResult } from '../../lib/addByRss/domain';
import { buildAddByRssFeedRecord, pollAddByRssParseStatus } from '../../lib/addByRss/domain';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { getDb, initializeDatabase, safeJsonParse, schema } from '../db';
import type { AddByRssFeedRow } from '../db/schema';
import { addByRssCredentialStore } from './addByRssCredentialStore';
import { channelLiveStatusRepository } from './channelLiveStatusRepository';
import { channelSeenRepository } from './channelSeenRepository';
import { autoDownloadRepository } from './autoDownloadRepository';
import { syncEventLogRepository } from './syncEventLogRepository';
import type { MobileAuthRequestContext } from './types';

const isResourceType = (value: string): value is MobileAddByRSSFeedRecord['resourceType'] => {
  return (
    value === 'podcasts' ||
    value === 'episodes' ||
    value === 'artists' ||
    value === 'albums' ||
    value === 'tracks' ||
    value === 'livestreams'
  );
};

const rowToRecord = (row: AddByRssFeedRow): MobileAddByRSSFeedRecord => {
  return {
    id: row.id,
    idText: row.idText,
    resourceType: isResourceType(row.resourceType) ? row.resourceType : 'podcasts',
    feedUrl: row.feedUrl,
    title: row.title,
    imageUrl: row.imageUrl,
    updatedAt: row.updatedAt,
    enclosureUrl: row.enclosureUrl,
    latestItemPubDateMs: row.latestItemPubDateMs,
    playbackPosition: row.playbackPosition,
    requiresCredentials: row.requiresCredentials === 1,
    lastAuthFailure: isAddByRssAuthFailure(row.lastAuthFailure) ? row.lastAuthFailure : null,
  };
};

/** Only the credential fields a record actually sets, so an omitted one keeps its stored value. */
const credentialColumnValues = (
  record: Pick<MobileAddByRSSFeedRecord, 'lastAuthFailure' | 'requiresCredentials'>
): { lastAuthFailure?: string | null; requiresCredentials?: number } => ({
  ...(record.requiresCredentials !== undefined
    ? { requiresCredentials: record.requiresCredentials ? 1 : 0 }
    : {}),
  ...(record.lastAuthFailure !== undefined ? { lastAuthFailure: record.lastAuthFailure } : {}),
});

/**
 * A credential failure the user already sees in the needs-credentials section. The server answers
 * a flagged feed that arrived without credentials this way on every refresh, so logging it would
 * fill the error log with rows that explain nothing new.
 */
const isExpectedMissingCredentials = (result: AddByRssPollResult): boolean =>
  result.failureReason === 'credentials_required' && result.credentialsState === 'not_provided';

/**
 * Refresh failures already logged this session, keyed by feed, code, and server reason. Every
 * foreground re-parses every feed, so a feed whose host stays down would otherwise add a row per
 * foreground and push everything else out of the capped log.
 */
const loggedRefreshFailures = new Set<string>();

const recordRefreshFailure = (ticket: AddByRssRefreshTicket, result: AddByRssPollResult): void => {
  const entry = buildAddByRssParseFailureLog({
    feedUrl: ticket.feedUrl,
    jobKind: 'add-by-rss-parse',
    occurredAt: Date.now(),
    requestId: ticket.requestId,
    result,
  });
  if (entry === null) {
    return;
  }
  const key = `${ticket.feedUrl}\u0000${entry.errorCode ?? ''}\u0000${entry.message ?? ''}`;
  if (loggedRefreshFailures.has(key)) {
    return;
  }
  loggedRefreshFailures.add(key);
  void syncEventLogRepository.append(entry);
};

/** What a refresh request returns per feed: the ticket to poll for that feed's parse result. */
export type AddByRssRefreshTicket = {
  feedUrl: string;
  requestId: string;
};

type ParseAllResponse = {
  request_ids: { feed_url: string; request_id: string }[];
};

type CredentialPair = { password: string; username: string };

const toCredentialsByUrl = (
  credentials: ReadonlyMap<string, AddByRssCredentials>
): Record<string, CredentialPair> => {
  const byUrl: Record<string, CredentialPair> = {};
  for (const [feedUrl, value] of credentials) {
    byUrl[feedUrl] = { password: value.password, username: value.username };
  }
  return byUrl;
};

export type AddByRssFeedsByCredentials = {
  needsCredentials: AddByRssNeedsCredentialsFeed<MobileAddByRSSFeedRecord>[];
  ready: MobileAddByRSSFeedRecord[];
};

/**
 * Add-by-RSS feed repository — the source of truth for the mobile RSS list and add-by-RSS playback.
 *
 * Reads SQLite first so the list works offline. Each feed is stored **whole**, as the last
 * successful `@podverse/parser-mapping` compat bundle: the user chose the feed explicitly and there
 * is no server-side pagination behind it, so there is no window to enforce the way there is for
 * directory channels in `channelItemsRepository`.
 *
 * The interactive add/follow/unfollow calls stay in the hooks that orchestrate those flows. Keeping
 * a followed feed current is background reconciliation rather than a user action, so it lives here
 * where the sync queue can reach it (see mobile-data-layer skill).
 */
export const addByRssRepository = {
  /** All followed feeds, most-recently-updated first (offline-capable list). */
  listFeeds: async (): Promise<MobileAddByRSSFeedRecord[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssFeed)
      .orderBy(desc(schema.addByRssFeed.updatedAt));

    return rows.map(rowToRecord);
  },

  /**
   * Feeds split into the normal list and the needs-credentials section. A feed lands in the
   * section when it needs Basic Auth and this device holds no credentials for the signed-in
   * account, or when the last parse rejected the ones it holds.
   */
  listFeedsByCredentials: async (): Promise<AddByRssFeedsByCredentials> => {
    const [feeds, feedUrlsWithCredentials] = await Promise.all([
      addByRssRepository.listFeeds(),
      addByRssCredentialStore.listFeedUrlsForCurrentAccount(),
    ]);
    return partitionAddByRssFeedsByCredentials(feeds, feedUrlsWithCredentials);
  },

  getFeedByUrl: async (feedUrl: string): Promise<MobileAddByRSSFeedRecord | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
      .limit(1);

    const row = rows[0];
    return row === undefined ? null : rowToRecord(row);
  },

  getFeedByIdText: async (idText: string): Promise<MobileAddByRSSFeedRecord | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select()
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.idText, idText))
      .limit(1);

    const row = rows[0];
    return row === undefined ? null : rowToRecord(row);
  },

  /** Read the last-parsed compat bundle for a feed (for full-resource-data playback). */
  getMappedFeedByUrl: async (feedUrl: string): Promise<AddByRSSMappedFeed | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ mappedFeedJson: schema.addByRssFeed.mappedFeedJson })
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl))
      .limit(1);

    const raw = rows[0]?.mappedFeedJson ?? null;
    return raw === null ? null : safeJsonParse<AddByRSSMappedFeed>(raw);
  },

  /** Feed URLs that already have a parsed bundle stored, for parse-status display. */
  listParsedFeedUrls: async (): Promise<string[]> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ feedUrl: schema.addByRssFeed.feedUrl })
      .from(schema.addByRssFeed)
      .where(isNotNull(schema.addByRssFeed.mappedFeedJson));

    return rows.map((row) => row.feedUrl);
  },

  /**
   * Upsert a feed record. When `mappedFeed` is provided (a fresh successful parse) its bundle is
   * persisted; when omitted (e.g. a followed-list merge), the existing `mapped_feed_json` is left
   * untouched so the parsed bundle is preserved.
   *
   * `latest_item_pub_date_ms` follows the bundle for the same reason: both are derived from a parse,
   * and a followed-list merge that wrote a null over a known date would drop a followed feed to the
   * bottom of a recency-ordered list until the next parse landed. The feed's live status is derived
   * at the same moment and for the same reason — reading it when the list is drawn would mean
   * deserializing a whole feed per row.
   */
  upsertFeed: async (
    record: MobileAddByRSSFeedRecord,
    mappedFeed?: AddByRSSMappedFeed | null
  ): Promise<void> => {
    await initializeDatabase();

    const existingRows = await getDb()
      .select({ feedUrl: schema.addByRssFeed.feedUrl })
      .from(schema.addByRssFeed)
      .where(eq(schema.addByRssFeed.feedUrl, record.feedUrl))
      .limit(1);
    const isNewFeed = existingRows.length === 0;

    const baseValues = {
      feedUrl: record.feedUrl,
      id: record.id,
      idText: record.idText,
      resourceType: record.resourceType,
      title: record.title,
      imageUrl: record.imageUrl,
      enclosureUrl: record.enclosureUrl,
      playbackPosition: record.playbackPosition,
      updatedAt: record.updatedAt,
      ...credentialColumnValues(record),
    };

    if (mappedFeed !== undefined) {
      const parsedValues = {
        latestItemPubDateMs: record.latestItemPubDateMs,
        mappedFeedJson: mappedFeed === null ? null : JSON.stringify(mappedFeed),
      };
      await getDb()
        .insert(schema.addByRssFeed)
        .values({ ...baseValues, ...parsedValues })
        .onConflictDoUpdate({
          target: schema.addByRssFeed.feedUrl,
          set: { ...baseValues, ...parsedValues },
        });
      await channelLiveStatusRepository.setFromAddByRssBundle(record.feedUrl, mappedFeed);
      if (isNewFeed) {
        void autoDownloadRepository
          .seedFromGlobalDefaults({
            channelIdText: record.feedUrl,
            source: 'add_by_rss',
          })
          .catch(() => undefined);
      }
      return;
    }

    await getDb()
      .insert(schema.addByRssFeed)
      .values({
        ...baseValues,
        latestItemPubDateMs: record.latestItemPubDateMs,
        mappedFeedJson: null,
      })
      .onConflictDoUpdate({
        target: schema.addByRssFeed.feedUrl,
        set: baseValues,
      });
    if (isNewFeed) {
      void autoDownloadRepository
        .seedFromGlobalDefaults({
          channelIdText: record.feedUrl,
          source: 'add_by_rss',
        })
        .catch(() => undefined);
    }
  },

  /** Record what a parse said about credentials without touching the rest of the row. */
  setCredentialStatus: async (feedUrl: string, status: AddByRssCredentialStatus): Promise<void> => {
    await initializeDatabase();
    await getDb()
      .update(schema.addByRssFeed)
      .set(credentialColumnValues(status))
      .where(eq(schema.addByRssFeed.feedUrl, feedUrl));
  },

  /**
   * Move `user:pass@` out of stored feed URLs and into SecureStore. Rows only carry userinfo when
   * they were added before credentials moved to the device, so once rewritten the scan finds
   * nothing and costs one small read. The account's follow row already uses the clean URL.
   */
  splitStoredUserinfo: async (accountIdText: string): Promise<void> => {
    const feeds = await addByRssRepository.listFeeds();
    for (const feed of feeds) {
      const split = splitAddByRssPastedUrl(feed.feedUrl);
      if (split === null) {
        continue;
      }
      const cleanUrl = toAddByRssCredentialFeedUrl(split.feedUrl);
      if (split.credentials !== null) {
        await addByRssCredentialStore.set(accountIdText, cleanUrl, split.credentials);
      }

      const existingClean = await addByRssRepository.getFeedByUrl(cleanUrl);
      if (existingClean === null) {
        await getDb()
          .update(schema.addByRssFeed)
          .set({ feedUrl: cleanUrl, requiresCredentials: 1 })
          .where(eq(schema.addByRssFeed.feedUrl, feed.feedUrl));
      } else {
        await getDb()
          .delete(schema.addByRssFeed)
          .where(eq(schema.addByRssFeed.feedUrl, feed.feedUrl));
        await addByRssRepository.setCredentialStatus(cleanUrl, {
          lastAuthFailure: existingClean.lastAuthFailure ?? null,
          requiresCredentials: true,
        });
      }
    }
  },

  /**
   * Ask the server to re-parse every feed the account follows, and return a ticket per feed.
   *
   * One request rather than one per feed: the endpoint fans out server-side and dedupes feeds it
   * parsed recently, so a device that foregrounds often does not repeatedly ask for the same work.
   * Feeds the server deduped come back with no ticket and are simply left as they are.
   *
   * Credentials this device holds for the account ride along in `credentials_by_url`; the API seals
   * them for the worker and never stores them. A feed that needs credentials this device lacks
   * gets no ticket back to poll: the server skips it, and the needs-credentials section already
   * says why.
   *
   * The caller is responsible for checking that the account may refresh at all — a lapsed
   * membership keeps its feeds readable and playable, and only stops them updating.
   */
  requestRefreshAll: async (
    context: MobileAuthRequestContext,
    accountIdText: string
  ): Promise<AddByRssRefreshTicket[]> => {
    const [credentials, feeds] = await Promise.all([
      addByRssCredentialStore.readAllForAccount(accountIdText),
      addByRssRepository.listFeeds(),
    ]);
    const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.apiRequest<ParseAllResponse>({
        path: '/account/add-by-rss/parse/all',
        method: 'POST',
        config: {
          withCredentials: true,
        },
        data: credentials.size > 0 ? { credentials_by_url: toCredentialsByUrl(credentials) } : {},
      })
    );

    const feedsByUrl = new Map(feeds.map((feed) => [feed.feedUrl, feed]));
    return response.request_ids
      .filter((entry) => {
        const feed = feedsByUrl.get(entry.feed_url);
        if (feed === undefined || feed.requiresCredentials !== true) {
          return true;
        }
        return credentials.has(toAddByRssCredentialFeedUrl(entry.feed_url));
      })
      .map((entry) => ({
        feedUrl: entry.feed_url,
        requestId: entry.request_id,
      }));
  },

  /**
   * Parse one feed now and store what came back: the interactive add, and save-and-check on the
   * credentials screen. Credentials go only in this request body, which the API seals for the
   * worker; they are never part of the follow.
   *
   * A feed already on the device keeps its stored episodes when this parse yields none, the same
   * rule a background refresh follows. A new feed is written either way so the add lands.
   */
  parseNow: async (
    context: MobileAuthRequestContext,
    feedUrl: string,
    credentials: AddByRssCredentials | null
  ): Promise<{ requestId: string; result: AddByRssPollResult }> => {
    const parseRequest = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.apiRequest<{ request_id: string }>({
        path: '/account/add-by-rss/parse',
        method: 'POST',
        config: {
          withCredentials: true,
        },
        data: {
          feed_url: feedUrl,
          ...(credentials !== null
            ? {
                basic_auth_password: credentials.password,
                basic_auth_username: credentials.username,
              }
            : {}),
        },
      })
    );

    const result = await pollAddByRssParseStatus(parseRequest.request_id, async (requestId) =>
      requestWithMobileAuthRefresh(context, async (apiRequestService) =>
        apiRequestService.apiRequest<AddByRSSParseCacheEntry<unknown>>({
          path: `/account/add-by-rss/parse/status/${requestId}`,
          method: 'GET',
          config: {
            withCredentials: true,
          },
        })
      )
    );

    const existingFeed = await addByRssRepository.getFeedByUrl(feedUrl);
    const credentialStatus = resolveAddByRssCredentialStatus({
      credentialsState: result.credentialsState,
      current: credentials !== null || existingFeed?.requiresCredentials === true,
      failureReason: result.failureReason,
      status: result.status,
    });
    const record = buildAddByRssFeedRecord(feedUrl, existingFeed ?? undefined, result.preview);
    await addByRssRepository.upsertFeed(
      {
        ...record,
        ...(credentials !== null ? { requiresCredentials: true } : {}),
        ...credentialStatus,
      },
      existingFeed === null ? result.mappedFeed : (result.mappedFeed ?? undefined)
    );

    return { requestId: parseRequest.request_id, result };
  },

  /**
   * Poll one re-parse ticket and adopt the result.
   *
   * A parse that has not resolved yet, or resolved without a usable payload, leaves the stored
   * bundle untouched. Overwriting it with nothing would take a feed that reads and plays offline
   * today and leave the user with a title and no episodes, which is strictly worse than stale.
   * The failure is still recorded in the error log so a feed that silently stopped updating has
   * an explanation.
   */
  applyRefreshResult: async (
    context: MobileAuthRequestContext,
    ticket: AddByRssRefreshTicket
  ): Promise<boolean> => {
    const result = await pollAddByRssParseStatus(ticket.requestId, async (requestId) =>
      requestWithMobileAuthRefresh(context, async (apiRequestService) =>
        apiRequestService.apiRequest<AddByRSSParseCacheEntry<unknown>>({
          path: `/account/add-by-rss/parse/status/${requestId}`,
          method: 'GET',
          config: {
            withCredentials: true,
          },
        })
      )
    );
    const { mappedFeed, preview } = result;
    const existingFeed = await addByRssRepository.getFeedByUrl(ticket.feedUrl);
    const credentialStatus = resolveAddByRssCredentialStatus({
      credentialsState: result.credentialsState,
      current: existingFeed?.requiresCredentials === true,
      failureReason: result.failureReason,
      status: result.status,
    });

    if (mappedFeed === null) {
      if (credentialStatus !== null && existingFeed !== null) {
        await addByRssRepository.setCredentialStatus(ticket.feedUrl, credentialStatus);
      }
      if (!isExpectedMissingCredentials(result)) {
        recordRefreshFailure(ticket, result);
      }
      return false;
    }

    const record = buildAddByRssFeedRecord(ticket.feedUrl, existingFeed ?? undefined, preview);
    await addByRssRepository.upsertFeed({ ...record, ...credentialStatus }, mappedFeed);
    return true;
  },

  removeFeed: async (feedUrl: string): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.addByRssFeed).where(eq(schema.addByRssFeed.feedUrl, feedUrl));
    await addByRssCredentialStore.deleteForCurrentAccount(feedUrl);
    await channelLiveStatusRepository.remove(feedUrl);
    await channelSeenRepository.remove(feedUrl);
    await autoDownloadRepository.removeChannel(feedUrl);
  },

  /** Clear all feeds (session reset / logout). */
  clear: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.addByRssFeed);
  },
};
