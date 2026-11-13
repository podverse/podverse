import type { CredentialScopeDecision } from './credentialScope.js';
import { resolveCredentialScope } from './credentialScope.js';

export type AddByRSSCredentialsWithheldDecision = Exclude<CredentialScopeDecision, 'send'>;

export type AddByRSSRedirectCredentialTracker = {
  /**
   * Whether Authorization may go with the request to `targetUrl`. False for every hop when no
   * credentials were attached, and for every hop after the first one that left scope.
   */
  allowsCredentialsTo: (targetUrl: string) => boolean;
  /** Why credentials stopped travelling, or null while they still go (or never went). */
  withheldDecision: () => AddByRSSCredentialsWithheldDecision | null;
};

/**
 * Credential scope across a chain of redirects. Credentials stay only on HTTPS hosts within the
 * feed's registrable domain (`resolveCredentialScope`), and once a hop leaves that scope they do
 * not come back, even when a later hop returns to the feed's own host.
 */
export const createAddByRSSRedirectCredentialTracker = ({
  allowInsecure,
  credentialsAttached,
  feedUrl,
}: {
  allowInsecure?: boolean;
  /** True when the first request carried credentials for this feed. */
  credentialsAttached: boolean;
  feedUrl: string;
}): AddByRSSRedirectCredentialTracker => {
  let withheld: AddByRSSCredentialsWithheldDecision | null = null;
  return {
    allowsCredentialsTo: (targetUrl) => {
      if (!credentialsAttached || withheld !== null) {
        return false;
      }
      const decision = resolveCredentialScope(feedUrl, targetUrl, { allowInsecure });
      if (decision === 'send') {
        return true;
      }
      withheld = decision;
      return false;
    },
    withheldDecision: () => withheld,
  };
};
