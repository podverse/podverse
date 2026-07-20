import type { AuthRequestDeps } from '../../auth/authRequestWithRefresh';

/**
 * Authenticated request context repositories need for product-data API calls. Screens/hooks source
 * this from `useAuth()` and pass it into repository methods; repositories then run the call through
 * `requestWithMobileAuthRefresh` (which owns bearer refresh). Product-data `req*` calls must live
 * inside repositories — never in screens (see mobile-data-layer skill).
 */
export type MobileAuthRequestContext = AuthRequestDeps;
