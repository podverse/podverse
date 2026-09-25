import { getDomain } from 'tldts';

export type CredentialScopeDecision = 'send' | 'withheld_other_domain' | 'withheld_insecure';

export type ResolveCredentialScopeOptions = {
  /** Dev / E2E only: allow http:// (test-assets). Default false. */
  allowInsecure?: boolean;
};

export type SplitFeedUrlUserinfo = {
  feedUrl: string;
  username: string | null;
  password: string | null;
};

const IPV4_HOSTNAME = /^\d{1,3}(\.\d{1,3}){3}$/;

const parseUrl = (value: string): URL | null => {
  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
};

const isHttpProtocol = (protocol: string): boolean => protocol === 'https:' || protocol === 'http:';

/** `URL.hostname` brackets IPv6 literals and normalizes IPv4 shorthand to dotted form. */
const isExactMatchHostname = (hostname: string): boolean =>
  hostname.startsWith('[') ||
  IPV4_HOSTNAME.test(hostname) ||
  hostname === 'localhost' ||
  hostname.endsWith('.localhost');

/**
 * Registrable domain (eTLD+1). Private suffixes (`github.io`, `s3.amazonaws.com`, …) count as
 * public so two tenants on one hosting platform never share credentials.
 */
const registrableDomain = (hostname: string): string | null =>
  getDomain(hostname, { allowPrivateDomains: true });

/**
 * Decides whether add-by-RSS Basic Auth credentials for `feedUrl` may be sent to `targetUrl`
 * (the feed itself, a redirect hop, an enclosure, chapters, artwork, …).
 *
 * Credentials travel only over HTTPS (unless `allowInsecure`) and only to hosts on the feed's
 * registrable domain. IP literals and `localhost` require an exact hostname match.
 */
export function resolveCredentialScope(
  feedUrl: string,
  targetUrl: string,
  options?: ResolveCredentialScopeOptions
): CredentialScopeDecision {
  const feed = parseUrl(feedUrl);
  const target = parseUrl(targetUrl);
  if (!feed || !target) {
    return 'withheld_other_domain';
  }

  if (!isHttpProtocol(feed.protocol) || !isHttpProtocol(target.protocol)) {
    return 'withheld_insecure';
  }
  if (
    options?.allowInsecure !== true &&
    (feed.protocol !== 'https:' || target.protocol !== 'https:')
  ) {
    return 'withheld_insecure';
  }

  const feedHost = feed.hostname.toLowerCase();
  const targetHost = target.hostname.toLowerCase();
  if (feedHost === '' || targetHost === '') {
    return 'withheld_other_domain';
  }

  if (isExactMatchHostname(feedHost) || isExactMatchHostname(targetHost)) {
    return feedHost === targetHost ? 'send' : 'withheld_other_domain';
  }

  const feedDomain = registrableDomain(feedHost);
  const targetDomain = registrableDomain(targetHost);
  if (feedDomain === null || targetDomain === null) {
    return feedHost === targetHost ? 'send' : 'withheld_other_domain';
  }

  return feedDomain === targetDomain ? 'send' : 'withheld_other_domain';
}

export type CredentialScopeHost = {
  /** Registrable domain (`match: 'domain'`) or the exact hostname (`match: 'exact'`). */
  host: string;
  /** `'domain'` also accepts subdomains of `host`; `'exact'` accepts only `host`. */
  match: 'domain' | 'exact';
};

/**
 * The scope {@link resolveCredentialScope} applies to `feedUrl`, as a host plus match mode, for
 * checks that run where the public suffix list is not available (native media engines answering
 * a 401 on a redirect hop). IPv6 literals come back without brackets. `null` for an unparseable or
 * non-http(s) feed URL.
 */
export function resolveCredentialScopeHost(feedUrl: string): CredentialScopeHost | null {
  const feed = parseUrl(feedUrl);
  if (!feed || !isHttpProtocol(feed.protocol)) {
    return null;
  }
  const host = feed.hostname.toLowerCase();
  if (host === '') {
    return null;
  }
  if (isExactMatchHostname(host)) {
    return { host: host.replace(/^\[/, '').replace(/\]$/, ''), match: 'exact' };
  }
  const domain = registrableDomain(host);
  return domain === null ? { host, match: 'exact' } : { host: domain, match: 'domain' };
}

const decodeUserinfoPart = (value: string): string | null => {
  if (value === '') {
    return null;
  }
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

/**
 * Strips userinfo from an http(s) URL into separate fields.
 *
 * The returned `feedUrl` is the parsed `href` with userinfo cleared, so it never contains
 * `user:pass@`. Callers still pass it through `canonicalHttpOrHttpsUrl`
 * (`@podverse/helpers-validation`) before storage or lookup, which is the single canonicalizer.
 * Unparseable or non-http(s) input comes back trimmed with null credentials.
 */
export function splitFeedUrlUserinfo(url: string): SplitFeedUrlUserinfo {
  const trimmed = url.trim();
  const parsed = parseUrl(trimmed);
  if (!parsed || !isHttpProtocol(parsed.protocol)) {
    return { feedUrl: trimmed, username: null, password: null };
  }

  const username = decodeUserinfoPart(parsed.username);
  const password = decodeUserinfoPart(parsed.password);
  parsed.username = '';
  parsed.password = '';

  return { feedUrl: parsed.href, username, password };
}
