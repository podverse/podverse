import type { CredentialScopeDecision } from '@podverse/helpers';
import { resolveCredentialScope } from '@podverse/helpers';

export type CredentialsWithheldDecision = Exclude<CredentialScopeDecision, 'send'>;

export type BuildCredentialScopedBeforeRedirectOptions = {
  feedUrl: string;
  /** True when the first request carried Basic Auth for this feed. */
  credentialsAttached: boolean;
  allowInsecure?: boolean;
  /** Called once, on the first hop that leaves credential scope. */
  onCredentialsWithheld?: (decision: CredentialsWithheldDecision) => void;
};

const AUTHORIZATION_HEADER = /^authorization$/i;

const stripAuthorizationHeaders = (headers: unknown): void => {
  if (typeof headers !== 'object' || headers === null) {
    return;
  }
  for (const key of Object.keys(headers)) {
    if (AUTHORIZATION_HEADER.test(key)) {
      Reflect.deleteProperty(headers, key);
    }
  }
};

/**
 * `beforeRedirect` hook for add-by-RSS feed fetches. `follow-redirects` already drops
 * Authorization when a redirect changes to a host that is not a subdomain; this hook enforces the
 * stricter add-by-RSS rule on every hop — credentials stay only on HTTPS hosts within the feed's
 * registrable domain — and reports when a hop withheld them so the failure can be classified.
 */
export const buildCredentialScopedBeforeRedirect = ({
  feedUrl,
  credentialsAttached,
  allowInsecure,
  onCredentialsWithheld,
}: BuildCredentialScopedBeforeRedirectOptions): ((options: Record<string, unknown>) => void) => {
  let withheld = false;

  return (redirectOptions) => {
    if (!credentialsAttached || withheld) {
      stripAuthorizationHeaders(redirectOptions.headers);
      return;
    }
    const targetUrl = typeof redirectOptions.href === 'string' ? redirectOptions.href : '';
    const decision = resolveCredentialScope(feedUrl, targetUrl, { allowInsecure });
    if (decision === 'send') {
      return;
    }
    withheld = true;
    stripAuthorizationHeaders(redirectOptions.headers);
    onCredentialsWithheld?.(decision);
  };
};
