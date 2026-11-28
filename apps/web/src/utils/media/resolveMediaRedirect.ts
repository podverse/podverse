import { fetchWithTimeout } from '@podverse/helpers-backend';
import type { OutboundConnectionTarget } from '@podverse/helpers-requests/outbound-http-policy';
import {
  OutboundUrlBlockedError,
  resolveOutboundFetchTarget,
} from '@podverse/helpers-requests/outbound-http-policy';
import { fetchForOutbound } from '@podverse/helpers-requests/outbound-requests';

import { PROXY } from '../proxy/constants';
import { validateProxyUrl } from '../proxy/urlValidator';

/** Why a redirect chain could or could not be handed to the browser. */
export type ResolveMediaUrlReason =
  | 'resolved'
  | 'same_url'
  | 'blocked_final'
  | 'http_error'
  | 'too_many_redirects'
  | 'invalid'
  | 'network';

export type ResolveMediaUrlBody = {
  url: string | null;
  reason: ResolveMediaUrlReason;
  httpStatus?: number;
};

const MAX_REDIRECTS = 5;

const invalid = (): ResolveMediaUrlBody => ({ url: null, reason: 'invalid' });

const network = (): ResolveMediaUrlBody => ({ url: null, reason: 'network' });

/**
 * Loopback the proxy already allows. Those hops skip the outbound DNS check, which rejects
 * loopback even when this server is permitted to fetch it.
 */
const proxyAllowsLoopback = (): boolean =>
  process.env.NODE_ENV !== 'production' || process.env.ALLOW_LOCALHOST_PROXY === 'true';

const isLoopbackHostname = (hostname: string): boolean => {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost')) {
    return true;
  }
  if (host === '::1') {
    return true;
  }
  return host.startsWith('127.');
};

const hasUserinfo = (url: URL): boolean => url.username !== '' || url.password !== '';

type PreparedHop =
  | { kind: 'loopback' }
  | { kind: 'guarded'; connection: OutboundConnectionTarget };

/**
 * Format, userinfo, and SSRF, including DNS for every host that is not an allowed loopback hop.
 * Throws when the hop must not be requested. A guarded hop carries the addresses the check
 * accepted.
 */
const prepareHop = async (hop: string): Promise<PreparedHop> => {
  let parsed: URL;
  try {
    parsed = new URL(hop);
  } catch {
    throw new OutboundUrlBlockedError('Invalid hop URL');
  }
  if (hasUserinfo(parsed)) {
    throw new OutboundUrlBlockedError('URLs with embedded credentials are not allowed');
  }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new OutboundUrlBlockedError('Hop URL is not allowed');
  }
  if (isLoopbackHostname(parsed.hostname) && proxyAllowsLoopback()) {
    return { kind: 'loopback' };
  }
  const validation = validateProxyUrl(hop);
  if (!validation.isValid) {
    throw new OutboundUrlBlockedError(validation.error ?? 'Hop URL is not allowed');
  }
  const connection = await resolveOutboundFetchTarget(hop);
  return { kind: 'guarded', connection };
};

const requestPrepared = async (
  hop: string,
  prepared: PreparedHop,
  init: {
    headers: Record<string, string>;
    method: 'GET' | 'HEAD';
  }
): Promise<Response> => {
  const options = {
    headers: init.headers,
    maxBodyBytes: 0,
    method: init.method,
    redirect: 'manual' as const,
    timeoutMs: PROXY.TIMEOUT_MS,
  };
  if (prepared.kind === 'loopback') {
    return fetchWithTimeout(hop, options);
  }
  return fetchForOutbound(hop, { ...options, connection: prepared.connection });
};

const requestHop = async (
  hop: string,
  userAgent: string,
  prepared: PreparedHop
): Promise<Response> => {
  const headers = { 'User-Agent': userAgent };
  const head = await requestPrepared(hop, prepared, { headers, method: 'HEAD' });
  if (head.status !== 405 && head.status !== 501) {
    return head;
  }
  return requestPrepared(hop, prepared, {
    headers: { ...headers, Range: 'bytes=0-0' },
    method: 'GET',
  });
};

const logResolveFailure = (hop: string): void => {
  let host: string;
  try {
    host = new URL(hop).host;
  } catch {
    host = 'invalid';
  }
  console.warn('Media URL resolution failed', { host });
};

const urlsMatch = (left: string, right: string): boolean => {
  try {
    return new URL(left).href === new URL(right).href;
  } catch {
    return left === right;
  }
};

const classifyFinal = (
  inputUrl: string,
  finalUrl: string,
  response: Response
): ResolveMediaUrlBody => {
  const corp = response.headers.get('cross-origin-resource-policy')?.trim().toLowerCase() ?? '';
  if (corp === 'same-origin' || corp === 'same-site' || (corp !== '' && corp !== 'cross-origin')) {
    return { url: null, reason: 'blocked_final' };
  }
  if (urlsMatch(inputUrl, finalUrl)) {
    return { url: null, reason: 'same_url' };
  }
  return { url: finalUrl, reason: 'resolved' };
};

/**
 * Follows redirects with HEAD (GET only when HEAD is refused) and returns the final URL.
 * The response body is discarded. No credentials are sent.
 */
export const resolveMediaRedirectChain = async (
  inputUrl: string,
  userAgent: string
): Promise<ResolveMediaUrlBody> => {
  let current = inputUrl;
  let followed = 0;

  while (followed <= MAX_REDIRECTS) {
    let prepared: PreparedHop;
    try {
      prepared = await prepareHop(current);
    } catch (error) {
      if (error instanceof OutboundUrlBlockedError) {
        return invalid();
      }
      logResolveFailure(current);
      return network();
    }

    let response: Response;
    try {
      response = await requestHop(current, userAgent, prepared);
    } catch (error) {
      if (error instanceof OutboundUrlBlockedError) {
        return invalid();
      }
      logResolveFailure(current);
      return network();
    }

    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (location === null || location.trim() === '') {
        return network();
      }
      followed += 1;
      if (followed > MAX_REDIRECTS) {
        return { url: null, reason: 'too_many_redirects' };
      }
      try {
        current = new URL(location, current).href;
      } catch {
        return invalid();
      }
      continue;
    }

    if (response.status >= 400) {
      return { url: null, reason: 'http_error', httpStatus: response.status };
    }

    if (response.status >= 200 && response.status < 300) {
      return classifyFinal(inputUrl, current, response);
    }

    return network();
  }

  return { url: null, reason: 'too_many_redirects' };
};
