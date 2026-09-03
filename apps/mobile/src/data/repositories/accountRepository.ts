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

  /**
   * Forget who is signed in, without forgetting what is on the device. Tokens are cleared through
   * the SecureStore path.
   *
   * Subscriptions, add-by-RSS feeds, and the car/watch browse index survive: they are the device's
   * own data, not an account cache. Signing out drops the identity and leaves the library
   * usable offline, which is also what makes signing back in a no-op for local content.
   */
  clearSnapshot: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.accountSnapshot);
  },

  /**
   * Fetch `/auth/me`, persist the snapshot, and return the account.
   *
   * One request and one write. Everything the account implies — hydrating directory follows,
   * followed playlists, the car browse index — is separately queued work, because folding it in
   * here is what made signing in wait on up to twenty-five paged requests.
   */
  refreshSnapshot: async (
    context: MobileAuthRequestContext,
    options: RefreshOptions = {}
  ): Promise<DTOAccount> => {
    const account = await fetchAccountFromApi(context, options);
    await accountRepository.saveSnapshot(account);
    return account;
  },

  /**
   * Hydrate the account's followed playlists into browse nodes.
   *
   * Followed playlists are numeric-id-only in `DTOAccount`, so this uses the `private_followed`
   * playlist list endpoint (server-derived from `account_following_playlists`) to get display
   * fields — mirroring the directory-channel hydration in `subscriptionsRepository`. No raw `fetch`
   * (reuses the mobile auth-refresh path).
   */
  fetchFollowedPlaylistNodes: async (
    account: DTOAccount,
    context: MobileAuthRequestContext
  ): Promise<NativeCacheBrowseNode[]> => {
    const followedPlaylists = account.account_following_playlists ?? [];
    if (followedPlaylists.length === 0) {
      return [];
    }

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
  },

  /**
   * Project the library-browse index to the native cache so CarPlay / Android Auto can list a
   * user's subscriptions (directory follows + add-by-RSS, from the shared
   * `subscriptionsRepository`) plus followed playlists with the phone app closed.
   *
   * Local-only: the caller supplies playlist nodes it already hydrated, so this stays a pure
   * projection and runs even when the playlist fetch before it failed. An incomplete car index
   * beats none at all.
   */
  projectLibraryBrowse: async (playlistNodes: NativeCacheBrowseNode[]): Promise<void> => {
    const subscribed = await subscriptionsRepository.list();
    const channelNodes = subscribed.map(mapSubscribedChannelToNode);
    const nodes = mergeLibraryBrowseNodes(channelNodes, playlistNodes);
    await projectLibraryBrowseIndexToNativeCache({ nodes });
  },
};
