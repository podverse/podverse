export type TermsAcceptanceRecord = {
  terms_version: string;
};

/**
 * A blank configured version means this deployment is not collecting terms acceptance.
 * A missing or different stored version means the account still has to accept the current text.
 */
export function isCurrentTermsAccepted(
  acceptance: TermsAcceptanceRecord | null | undefined,
  configuredVersion: string
): boolean {
  if (configuredVersion === '') {
    return true;
  }
  if (acceptance === null || acceptance === undefined) {
    return false;
  }
  return acceptance.terms_version === configuredVersion;
}
