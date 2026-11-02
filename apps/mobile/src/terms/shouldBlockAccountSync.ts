import type { AuthStatus } from '../auth/AuthProvider';

export type ShouldBlockAccountSyncInput = {
  accountPresent: boolean;
  /** Terms document has loaded (not still in flight). */
  agreementLoaded: boolean;
  /** Terms document fetch failed. */
  loadFailed: boolean;
  status: AuthStatus;
  /** Account has accepted the current terms version. */
  termsCurrent: boolean;
};

/**
 * Whether account-backed sync should park until consent is settled.
 *
 * A missing account snapshot must not block: `account-refresh` is what hydrates it. Blocking
 * there leaves the session authenticated with no account forever (Login CTAs that cannot open
 * the auth sheet, More still showing Log Out).
 */
export function shouldBlockAccountSync(input: ShouldBlockAccountSyncInput): boolean {
  if (input.status !== 'authenticated') {
    return false;
  }
  if (!input.accountPresent) {
    return false;
  }
  return !input.agreementLoaded || !input.termsCurrent || input.loadFailed;
}
