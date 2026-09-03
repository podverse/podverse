import type { AuthRequestDeps } from '../../auth/authRequestWithRefresh';

/**
 * Authenticated request context repositories need for product-data API calls. Screens/hooks source
 * this from `useAuth()` and pass it into repository methods; repositories then run the call through
 * `requestWithMobileAuthRefresh` (which owns bearer refresh). Product-data `req*` calls must live
 * inside repositories — never in screens (see mobile-data-layer skill).
 */
export type MobileAuthRequestContext = AuthRequestDeps;

/**
 * Which id space a subscription key belongs to: a directory channel is keyed by `id_text`, an
 * add-by-RSS feed by its URL. The two spaces are unrelated, so a key alone cannot say which it is.
 *
 * Shared by every per-subscription store, so a row written by one and read by another cannot
 * disagree about what its key means.
 */
export type SubscriptionKind = 'channel' | 'add-by-rss';
