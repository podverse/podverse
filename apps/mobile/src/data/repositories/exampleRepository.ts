import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { projectQueueSnapshotToNativeCache } from '../nativeCache';
import { isWatermarkStale, readSyncWatermark, readThrough, writeSyncWatermark } from '../sync';
import type { MobileAuthRequestContext } from './types';

/**
 * Example repository — demonstrates the offline-first seam without representing a product domain.
 * It demonstrates the required shape every repository follows:
 * - read-through: return a local value immediately; trigger a background fetch when stale
 * - API access lives here (via `requestWithMobileAuthRefresh`), never in screens/hooks
 * - project to the native cache after a successful sync so car/watch stay coherent
 */

const EXAMPLE_WATERMARK_KEY = 'example.lastSyncedAt';
const EXAMPLE_TTL_MS = 5 * 60 * 1000;

export type ExampleSnapshot = {
  lastSyncedAt: number | null;
};

const syncExample = async (context: MobileAuthRequestContext): Promise<void> => {
  // Repositories own product-data `req*` calls; this authed read proves the seam. Domain repos
  // replace this with their real endpoints (queues, account, add-by-rss).
  await requestWithMobileAuthRefresh(context, async (api) => api.reqQueueGetAllForAccountPrivate());

  await writeSyncWatermark(EXAMPLE_WATERMARK_KEY, Date.now());

  // Car/watch cannot read SQLite — project a browse snapshot after every successful sync/mutation.
  // The product queue repository supplies real entries; this example uses an empty snapshot.
  await projectQueueSnapshotToNativeCache({ nowPlayingIdText: null, entries: [] });
};

export const exampleRepository = {
  /** Read local snapshot immediately; refresh from the API in the background when stale. */
  getSnapshot: async (context: MobileAuthRequestContext): Promise<ExampleSnapshot> =>
    readThrough<ExampleSnapshot>({
      readLocal: async () => ({ lastSyncedAt: await readSyncWatermark(EXAMPLE_WATERMARK_KEY) }),
      isStale: async () => isWatermarkStale(EXAMPLE_WATERMARK_KEY, EXAMPLE_TTL_MS),
      fetchRemote: async () => syncExample(context),
    }),
};
