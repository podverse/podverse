import { eq } from 'drizzle-orm';

import type { DTOAccount } from '@podverse/helpers/dto';
import { isObjectLike } from '@podverse/helpers/guards';

// Import directly from the request module (not the auth barrel) to avoid a cycle:
// AuthProvider → accountRepository → auth barrel → AuthProvider.
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { getDb, initializeDatabase, schema } from '../db';
import type { NativeCacheBrowseNode } from '../nativeCache';
import { projectLibraryBrowseIndexToNativeCache } from '../nativeCache';
import {
  mapPlaylistToNode,
  mapSubscribedChannelToNode,
  mergeLibraryBrowseNodes,
} from './libraryBrowseProjection';
import { subscriptionsRepository } from './subscriptionsRepository';
import type { MobileAuthRequestContext } from './types';

const ACCOUNT_SNAPSHOT_ID = 'current';

type RefreshOptions = {
  /** Abort the `/auth/me` call (and its refresh retry) after this budget so hydrate never hangs. */
  timeoutMs?: number;
};

const parseAccountSnapshot = (raw: string): DTOAccount | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isObjectLike(parsed)) {
      return null;
    }

    // The snapshot is the exact DTOAccount we persisted from `/auth/me`; validated as an object
    // above. Single documented assertion (see avoid-type-assertions rule).
    return parsed as unknown as DTOAccount;
  } catch {
    return null;
  }
};

const fetchAccountFromApi = async (
  context: MobileAuthRequestContext,
  options: RefreshOptions
): Promise<DTOAccount> => {
  return requestWithMobileAuthRefresh(context, async (apiRequestService) =>
    apiRequestService.apiRequest<DTOAccount>({
      method: 'GET',
      path: '/auth/me',
      ...(options.timeoutMs !== undefined
        ? { abort: { controller: new AbortController(), timeoutMs: options.timeoutMs } }
        : {}),
    })
  );
};

/**
 * Hydrate the account's followed playlists into browse nodes. Followed playlists are numeric-id-only
 * in `DTOAccount`, so this uses the `private_followed` playlist list endpoint (server-derived from
 * `account_following_playlists`) to get display fields — mirroring the directory-channel hydration in
 * `subscriptionsRepository`. Soft-fail: any hydration error yields an empty node list so the channel
 * projection still lands. No raw `fetch` (reuses the mobile auth-refresh path).
 */
const fetchFollowedPlaylistNodes = async (
  account: DTOAccount,
  context: MobileAuthRequestContext
): Promise<NativeCacheBrowseNode[]> => {
  const followedPlaylists = account.account_following_playlists ?? [];
  if (followedPlaylists.length === 0) {
    return [];
  }

  try {
    const response = await requestWithMobileAuthRefresh(context, async (apiRequestService) =>
      apiRequestService.reqPlaylistGetMany({
        medium: 'all',
        page: 1,
        range: null,
        sort: 'a_z',
        type: 'private_followed',
      })
    );

    const nodes: NativeCacheBrowseNode[] = [];
    for (const playlist of response.data) {
      const node = mapPlaylistToNode(playlist);
      if (node !== null) {
        nodes.push(node);
      }
    }
    return nodes;
  } catch (error) {
    console.warn('[library-browse] playlist hydration failed (soft-fail)', error);
    return [];
  }
};

/**
 * Project the library-browse index to the native cache so CarPlay / Android Auto can list a user's
 * subscriptions (directory follows + add-by-RSS, from the shared `subscriptionsRepository`) plus
 * followed playlists with the phone app closed. Repository-owned (never called from screens) and
 * best-effort: channel-list and playlist hydration each soft-fail independently, and the projection
 * helper itself never throws, so this never blocks the account snapshot write.
 */
const projectLibraryBrowseForAccount = async (
  account: DTOAccount,
  context: MobileAuthRequestContext
): Promise<void> => {
  let channelNodes: NativeCacheBrowseNode[] = [];
  try {
    const subscribed = await subscriptionsRepository.list();
    channelNodes = subscribed.map(mapSubscribedChannelToNode);
  } catch (error) {
    console.warn('[library-browse] subscription list failed (soft-fail)', error);
  }

  const playlistNodes = await fetchFollowedPlaylistNodes(account, context);
  const nodes = mergeLibraryBrowseNodes(channelNodes, playlistNodes);
  await projectLibraryBrowseIndexToNativeCache({ nodes });
};

/**
 * Account/session snapshot repository. Reads/writes the cached `/auth/me` payload in SQLite for
 * cold-start display; the network fetch (and bearer refresh) lives here, not in screens. Tokens
 * remain in SecureStore only.
 */
export const accountRepository = {
  /** Read the cached account for instant cold-start render (null when none / unparseable). */
  getSnapshot: async (): Promise<DTOAccount | null> => {
    await initializeDatabase();
    const rows = await getDb()
      .select({ payloadJson: schema.accountSnapshot.payloadJson })
      .from(schema.accountSnapshot)
      .where(eq(schema.accountSnapshot.id, ACCOUNT_SNAPSHOT_ID))
      .limit(1);

    const raw = rows[0]?.payloadJson ?? null;
    return raw === null ? null : parseAccountSnapshot(raw);
  },

  /** Upsert the account snapshot after a successful `/auth/me`. */
  saveSnapshot: async (account: DTOAccount): Promise<void> => {
    await initializeDatabase();
    const updatedAt = Date.now();
    const payloadJson = JSON.stringify(account);
    await getDb()
      .insert(schema.accountSnapshot)
      .values({ id: ACCOUNT_SNAPSHOT_ID, payloadJson, updatedAt })
      .onConflictDoUpdate({
        target: schema.accountSnapshot.id,
        set: { payloadJson, updatedAt },
      });
  },

  /** Clear account rows on logout / session reset (tokens are cleared via SecureStore path). */
  clearSnapshot: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.accountSnapshot);

    // Clear the car/watch browse index on logout so no stale subscriptions remain readable.
    await projectLibraryBrowseIndexToNativeCache({ nodes: [] });

    // Clear the unified subscriptions directory cache (add-by-RSS is cleared via its own repo).
    await subscriptionsRepository.clearCache();
  },

  /** Fetch `/auth/me`, persist the snapshot, and return the account. */
  refresh: async (
    context: MobileAuthRequestContext,
    options: RefreshOptions = {}
  ): Promise<DTOAccount> => {
    const account = await fetchAccountFromApi(context, options);
    await accountRepository.saveSnapshot(account);

    // Refresh the unified subscriptions directory cache (hydrates numeric follows for offline +
    // car/Home/Library). Soft-fail so a hydration error never breaks the authenticated refresh.
    try {
      await subscriptionsRepository.syncFromAccount(account, context);
    } catch (error) {
      console.warn('[subscriptions] syncFromAccount failed (soft-fail)', error);
    }

    // Mirror subscriptions + followed playlists into the native cache for car/watch browse. Runs
    // after syncFromAccount so the merged list includes freshly hydrated directory follows; needs
    // `context` to hydrate playlist display fields. Soft-fail (never blocks the refresh).
    await projectLibraryBrowseForAccount(account, context);

    return account;
  },
};
