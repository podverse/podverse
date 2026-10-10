import { isCurrentTermsAccepted } from '@podverse/helpers';
import type { DTOAccount } from '@podverse/helpers';

export function isTermsAcceptanceRequired(
  loggedInAccount: DTOAccount | null,
  configuredTermsVersion: string
): boolean {
  if (loggedInAccount === null) {
    return false;
  }

  return !isCurrentTermsAccepted(loggedInAccount.account_terms_acceptance, configuredTermsVersion);
}
