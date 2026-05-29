import type { DTOAccount } from '@podverse/helpers';

export function isTermsAcceptanceRequired(
  loggedInAccount: DTOAccount | null,
  configuredTermsVersion: string
): boolean {
  if (loggedInAccount === null) {
    return false;
  }

  const acceptance = loggedInAccount.account_terms_acceptance;
  if (acceptance === undefined || acceptance === null) {
    return true;
  }

  return acceptance.terms_version !== configuredTermsVersion;
}
