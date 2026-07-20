import { eq } from 'drizzle-orm';

import type { DTOAccount } from '@podverse/helpers/dto';

// Import directly from the request module (not the auth barrel) to avoid a cycle:
// AuthProvider → accountRepository → auth barrel → AuthProvider.
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { getDb, initializeDatabase, schema } from '../db';
import type { MobileAuthRequestContext } from './types';

const ACCOUNT_SNAPSHOT_ID = 'current';

type RefreshOptions = {
  /** Abort the `/auth/me` call (and its refresh retry) after this budget so hydrate never hangs. */
  timeoutMs?: number;
};

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const parseAccountSnapshot = (raw: string): DTOAccount | null => {
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!isRecord(parsed)) {
      return null;
    }

    // The snapshot is the exact DTOAccount we persisted from `/auth/me`; validated as an object
    // above. Single documented assertion (see avoid-type-assertions rule).
    return parsed as DTOAccount;
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

  /** Clear account rows on logout / session reset (tokens are cleared via SecureStore path). */
  clearSnapshot: async (): Promise<void> => {
    await initializeDatabase();
    await getDb().delete(schema.accountSnapshot);
  },

  /** Fetch `/auth/me`, persist the snapshot, and return the account. */
  refresh: async (
    context: MobileAuthRequestContext,
    options: RefreshOptions = {}
  ): Promise<DTOAccount> => {
    const account = await fetchAccountFromApi(context, options);
    await accountRepository.saveSnapshot(account);
    return account;
  },
};
