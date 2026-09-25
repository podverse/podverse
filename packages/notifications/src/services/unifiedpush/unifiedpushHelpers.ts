import { DEFAULT_HTTP_TIMEOUT_MS } from '@podverse/helpers';

export type UPSubscription = {
  up_endpoint: string;
  up_auth_key: string | null;
};

/**
 * UnifiedPush POSTs abort after the shared HTTP timeout so a slow distributor cannot hold the
 * sender.
 */
export const UNIFIED_PUSH_SEND_TIMEOUT_MS = DEFAULT_HTTP_TIMEOUT_MS;
