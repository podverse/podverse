import { resolveCredentialScope, resolveCredentialScopeHost } from '@podverse/helpers';

import type { MediaEngineBasicAuth } from '../../../modules/podverse-media-engine';
import type { AddByRssCredentials } from './credentials';

/**
 * Whether add-by-RSS feed credentials went with a media, download, or artwork request, and if
 * not, why. `withheld_*` values are the reasons an error-log row records when the host then
 * refuses the file.
 */
export type AddByRssMediaCredentialsState =
  | 'sent'
  | 'not_stored'
  | 'not_remote'
  | 'withheld_other_domain'
  | 'withheld_insecure'
  | 'withheld_unverified_platform';

export type AddByRssMediaAuthInput = {
  /** Canonical feed URL the credentials belong to (E2E loopback rewrite already applied). */
  feedUrl: string;
  /** URL about to be requested (E2E loopback rewrite already applied). */
  mediaUrl: string;
  credentials: AddByRssCredentials | null;
  allowInsecure: boolean;
};

export type AddByRssPlaybackAuthDecision = {
  basicAuth: MediaEngineBasicAuth | null;
  state: AddByRssMediaCredentialsState;
};

export type AddByRssEagerHeaderPlatform = 'android' | 'ios';

export type AddByRssHeaderAuthDecision = {
  headers: Record<string, string> | null;
  state: AddByRssMediaCredentialsState;
};

const isRemoteHttpUrl = (url: string): boolean => /^https?:\/\//i.test(url.trim());

const scopeDecision = (
  input: AddByRssMediaAuthInput
): { state: AddByRssMediaCredentialsState; credentials: AddByRssCredentials | null } => {
  if (!isRemoteHttpUrl(input.mediaUrl)) {
    return { credentials: null, state: 'not_remote' };
  }
  if (input.credentials === null || input.credentials.username === '') {
    return { credentials: null, state: 'not_stored' };
  }
  const scope = resolveCredentialScope(input.feedUrl, input.mediaUrl, {
    allowInsecure: input.allowInsecure,
  });
  if (scope !== 'send') {
    return { credentials: null, state: scope };
  }
  return { credentials: input.credentials, state: 'sent' };
};

/**
 * Engine `basicAuth` for a playback load.
 *
 * The media URL must itself be in scope, and the engine still re-checks every host that
 * challenges (redirect hops) against the feed's scope before answering, so credentials only ever
 * reach the feed's own domain.
 */
export function decideAddByRssPlaybackAuth(
  input: AddByRssMediaAuthInput
): AddByRssPlaybackAuthDecision {
  const decision = scopeDecision(input);
  if (decision.credentials === null) {
    return { basicAuth: null, state: decision.state };
  }
  const scopeHost = resolveCredentialScopeHost(input.feedUrl);
  if (scopeHost === null) {
    return { basicAuth: null, state: 'withheld_other_domain' };
  }
  return {
    basicAuth: {
      allowInsecure: input.allowInsecure,
      password: decision.credentials.password,
      scopeHost: scopeHost.host,
      scopeMatch: scopeHost.match,
      username: decision.credentials.username,
    },
    state: 'sent',
  };
}

/** `Basic` header value; UTF-8 before base64 so non-Latin-1 credentials encode correctly. */
export function encodeBasicAuthorization(credentials: AddByRssCredentials): string {
  const bytes = new TextEncoder().encode(`${credentials.username}:${credentials.password}`);
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return `Basic ${btoa(binary)}`;
}

/**
 * `Authorization` header for requests that attach it up front (downloads, artwork).
 *
 * Only Android sends it: those requests run on OkHttp, which removes `Authorization` whenever it
 * follows a redirect to a different host, port, or scheme. On iOS they run on `NSURLSession`,
 * whose handling of a caller-set `Authorization` across redirects is not documented, so the
 * header is withheld there rather than risk a hop off the feed's domain receiving it.
 */
export function decideAddByRssHeaderAuth(
  input: AddByRssMediaAuthInput & { platform: AddByRssEagerHeaderPlatform }
): AddByRssHeaderAuthDecision {
  const decision = scopeDecision(input);
  if (decision.credentials === null) {
    return { headers: null, state: decision.state };
  }
  if (input.platform !== 'android') {
    return { headers: null, state: 'withheld_unverified_platform' };
  }
  return {
    headers: { Authorization: encodeBasicAuthorization(decision.credentials) },
    state: 'sent',
  };
}
