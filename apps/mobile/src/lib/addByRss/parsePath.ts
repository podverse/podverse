/**
 * Where an Add by RSS feed is fetched and parsed.
 *
 * A signed-in session parses Add by RSS feeds on the Podverse server whatever its membership, so
 * every device of the account shows the same result. A signed-out device fetches and parses on
 * this phone. Membership decides what a signed-in user may do, not where the parse runs. Every
 * caller that picks between the two goes through this function.
 */
import type { DTOAccount } from '@podverse/helpers/dto';

export type AddByRssParsePath = 'server' | 'device';

/**
 * `'device'` only when there is no account and the session is not authenticated. An
 * authenticated session whose account snapshot has not loaded yet still answers `'server'`.
 */
export const resolveAddByRssParsePath = (
  account: DTOAccount | null,
  options?: { isAuthenticated?: boolean }
): AddByRssParsePath =>
  account === null && options?.isAuthenticated !== true ? 'device' : 'server';
