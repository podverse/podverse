/**
 * Fetches and parses an Add by RSS feed on this device, with no Podverse API request. Signed-out
 * users parse here; a signed-in session always uses the server parse. The steps and their order
 * match the server parse: canonicalize the URL, wait for host spacing, attach conditional headers
 * and Basic auth, fetch, treat 304 or an unchanged body hash as `not_modified`, parse with
 * partytime, and classify a failure with the shared failure-reason rule.
 *
 * Redirects are followed one hop at a time (`redirect: 'manual'`) so credential scope is decided
 * for every hop: credentials go only to HTTPS hosts within the feed's registrable domain, and once
 * a hop leaves that scope they stay dropped for the rest of the chain, even back on the feed's own
 * host. Credentials and the Authorization header never appear in a result or an error. The files
 * a feed links (chapters, transcripts) go through the same request path
 * (`runAddByRssDeviceResourceFetch`), with scope decided against the feed they belong to.
 *
 * The stored hash names the app version that produced it (`<version>|<hash>`). A cache from
 * another version is not used, so the first refresh after an app update downloads and re-parses
 * every device feed once and that build's parser and mapping fixes reach unchanged feeds.
 *
 * Intentional differences from the server parse:
 * - No private-address policy. The phone fetches what the user typed from the user's own network,
 *   so a feed on a home network address works here and is refused by the server.
 * - One 30 s deadline covers host spacing, every hop, and the body read (the server allows 5 s),
 *   because phones on cellular need longer.
 * - Host spacing counts from this device's previous request to that host instead of a fixed sleep
 *   before every request.
 * - The body hash is a fast non-cryptographic hash kept only on this device. It is never compared
 *   with the server's feed hash.
 * - At most 10 redirects; one more is a transport failure, as on the server.
 *
 * No React Native or Expo imports: fetch, clock, and sleep are injected so this runs in node.
 */
import { parseFeed } from 'podverse-partytime/core';

import type {
  AddByRSSParseAuthChallenge,
  AddByRSSParseCredentialsState,
  AddByRSSParseStatus,
} from '@podverse/helpers';
import {
  createAddByRSSRedirectCredentialTracker,
  normalizeRawFeedForHash,
  resolveAddByRSSHostRequestSpacing,
  resolveAddByRSSParseFailureReason,
  resolveCredentialScope,
  resolveParserMaxFeedBodyBytes,
  toAddByRSSAuthChallenge,
} from '@podverse/helpers';
import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation/client';

import type { AddByRssDeviceCache } from '../../data/repositories/addByRssDevicePath';
import type { AddByRssCredentials } from './credentials';
import type { AddByRssPollResult } from './domain';
import { resolveAddByRssParsePayload } from './domain';
import { encodeBasicAuthorization } from './mediaAuth';

export type AddByRssDeviceParseInput = {
  conditionalCache: AddByRssDeviceCache | null;
  credentials: AddByRssCredentials | null;
  feedUrl: string;
  signal?: AbortSignal;
};

export type AddByRssDeviceParseResult = AddByRssPollResult & {
  conditionalCache: AddByRssDeviceCache | null;
};

export const ADD_BY_RSS_DEVICE_FETCH_TIMEOUT_MS = 30_000;
export const ADD_BY_RSS_DEVICE_MAX_REDIRECTS = 10;

export type AddByRssDeviceFetch = (
  url: string,
  init: { headers: Record<string, string>; redirect: 'manual'; signal: AbortSignal }
) => Promise<{
  headers: { get(name: string): string | null };
  status: number;
  text(): Promise<string>;
}>;

export type AddByRssHostPacer = {
  /** Resolves when a request to `url` may start; reserves that slot before waiting. */
  waitTurn: (url: string) => Promise<void>;
};

export type AddByRssDeviceFetchDeps = {
  allowInsecureCredentials: boolean;
  fetch: AddByRssDeviceFetch;
  pacer: AddByRssHostPacer;
  rewriteUrl: (url: string) => string;
  timeoutMs: number;
  userAgent: string;
};

export type AddByRssDeviceParseDeps = AddByRssDeviceFetchDeps & {
  parseVersion: string;
};

export type AddByRssDeviceResourceInput = {
  credentials: AddByRssCredentials | null;
  /** The feed the file belongs to; credential scope is decided against this URL. */
  feedUrl: string;
  signal?: AbortSignal;
  url: string;
};

export type AddByRssDeviceResource = {
  /** Empty for a status outside 2xx. */
  body: string;
  status: number;
};

type DeviceFetchResponse = Awaited<ReturnType<AddByRssDeviceFetch>>;

const REDIRECT_STATUSES: ReadonlySet<number> = new Set([301, 302, 303, 307, 308]);

const MAX_FEED_BODY_BYTES = resolveParserMaxFeedBodyBytes(undefined);

const cyrb53 = (value: string): string => {
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;
  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);
    h1 = Math.imul(h1 ^ code, 2654435761);
    h2 = Math.imul(h2 ^ code, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
  h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
  h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(16);
};

/** The device feed hash: the parsing app version, then the normalized body's length and hash. */
export const hashRawFeedForDevice = (raw: string, parseVersion: string): string => {
  const normalized = normalizeRawFeedForHash(raw);
  return `${parseVersion}|${normalized.length.toString(16)}-${cyrb53(normalized)}`;
};

/** A cache is used only when this app version produced its hash. */
export const isUsableDeviceCache = (
  cache: AddByRssDeviceCache | null,
  parseVersion: string
): cache is AddByRssDeviceCache & { feedHash: string } =>
  cache !== null && cache.feedHash !== null && cache.feedHash.startsWith(`${parseVersion}|`);

/** `<app name without spaces>/<version> (<platform>)`, for example `PodverseNext/5.6.0 (ios)`. */
export const buildAddByRssDeviceUserAgent = ({
  appName,
  appVersion,
  platform,
}: {
  appName: string;
  appVersion: string;
  platform: string;
}): string => `${appName.replace(/\s+/g, '')}/${appVersion} (${platform})`;

/**
 * Spaces requests to hosts with a spacing rule. The slot is reserved before waiting, so two
 * parses running together (an interactive add and a background refresh) still space out.
 */
export const createAddByRssHostPacer = ({
  now,
  sleep,
}: {
  now: () => number;
  sleep: (ms: number) => Promise<unknown>;
}): AddByRssHostPacer => {
  const nextAllowedAt = new Map<string, number>();
  return {
    waitTurn: async (url) => {
      const spacing = resolveAddByRSSHostRequestSpacing(url);
      if (spacing === null) {
        return;
      }
      const startAt = Math.max(now(), nextAllowedAt.get(spacing.key) ?? 0);
      nextAllowedAt.set(spacing.key, startAt + spacing.spacingMs);
      const waitMs = startAt - now();
      if (waitMs > 0) {
        await sleep(waitMs);
      }
    },
  };
};

const HTTP_SCHEME = /^(https?):\/\/[^/?#]/i;
const ANY_SCHEME = /^[a-z][a-z0-9+.-]*:/i;
const BASE_URL_PARTS = /^(https?:)\/\/([^/?#]*)([^?#]*)/i;

/** Applies `.` and `..` segments to an absolute path (one that starts with `/`). */
const removeDotSegments = (path: string): string => {
  const segments = path.split('/');
  const output: string[] = [];
  segments.forEach((segment, index) => {
    const isLast = index === segments.length - 1;
    if (segment === '.' || segment === '..') {
      if (segment === '..' && output.length > 1) {
        output.pop();
      }
      if (isLast) {
        output.push('');
      }
      return;
    }
    output.push(segment);
  });
  const joined = output.join('/');
  return joined.startsWith('/') ? joined : `/${joined}`;
};

/**
 * Resolves a redirect `Location` against the URL that answered. Handles an absolute `http:` or
 * `https:` URL, a protocol-relative `//host/path`, a root-relative `/path`, a query-only `?q`, and
 * a path-relative reference; drops any fragment. Null for any other scheme or an unusable base.
 * React Native's `URL` joins relative references by string concatenation, so this does not use it.
 */
export const resolveRedirectLocation = (location: string, baseUrl: string): string | null => {
  const fragmentIndex = location.indexOf('#');
  const reference = (fragmentIndex === -1 ? location : location.slice(0, fragmentIndex)).trim();
  if (reference === '') {
    return null;
  }
  if (HTTP_SCHEME.test(reference)) {
    return reference;
  }
  if (ANY_SCHEME.test(reference)) {
    return null;
  }

  const base = BASE_URL_PARTS.exec(baseUrl);
  if (base === null) {
    return null;
  }
  const [, scheme, authority, basePathRaw] = base;
  if (scheme === undefined || authority === undefined || authority === '') {
    return null;
  }
  const basePath = basePathRaw === undefined || basePathRaw === '' ? '/' : basePathRaw;

  if (reference.startsWith('//')) {
    return HTTP_SCHEME.test(`${scheme}${reference}`) ? `${scheme}${reference}` : null;
  }

  const origin = `${scheme}//${authority}`;
  if (reference.startsWith('?')) {
    return `${origin}${basePath}${reference}`;
  }

  const queryIndex = reference.indexOf('?');
  const referencePath = queryIndex === -1 ? reference : reference.slice(0, queryIndex);
  const referenceQuery = queryIndex === -1 ? '' : reference.slice(queryIndex);
  if (referencePath.startsWith('/')) {
    return `${origin}${removeDotSegments(referencePath)}${referenceQuery}`;
  }
  const baseDirectory = basePath.slice(0, basePath.lastIndexOf('/') + 1);
  return `${origin}${removeDotSegments(`${baseDirectory}${referencePath}`)}${referenceQuery}`;
};

const createAbortError = (): Error => {
  const error = new Error('The Add by RSS device request was aborted');
  error.name = 'AbortError';
  return error;
};

/**
 * `AbortSignal.aborted` can flip after a read. A direct `=== true` check narrows the property to
 * `false` for the rest of the function, so a later check has to go through a new read.
 */
const isAborted = (signal: AbortSignal | undefined): boolean => signal?.aborted === true;

/** Settles with `promise`, or rejects as soon as `signal` aborts, whichever comes first. */
const raceAbort = <T>(promise: Promise<T>, signal: AbortSignal): Promise<T> =>
  new Promise<T>((resolve, reject) => {
    if (signal.aborted) {
      reject(createAbortError());
      return;
    }
    const onAbort = () => reject(createAbortError());
    signal.addEventListener('abort', onAbort);
    promise.then(
      (value) => {
        signal.removeEventListener('abort', onAbort);
        resolve(value);
      },
      (error: unknown) => {
        signal.removeEventListener('abort', onAbort);
        reject(error);
      }
    );
  });

const readHeader = (response: DeviceFetchResponse, name: string): string | null => {
  const value = response.headers.get(name);
  if (value === null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const readContentLength = (response: DeviceFetchResponse): number | null => {
  const value = readHeader(response, 'content-length');
  if (value === null || !/^\d+$/.test(value)) {
    return null;
  }
  return Number(value);
};

type DeviceRequestOutcome =
  | { kind: 'response'; response: DeviceFetchResponse }
  | { kind: 'unresolved_redirect'; response: DeviceFetchResponse }
  | { kind: 'too_many_redirects' };

/**
 * The one device request path for Add by RSS: requests `url`, then follows redirects one hop at a
 * time with host spacing before every hop. Credentials start only when `url` is in `scopeUrl`'s
 * credential scope, and every hop is re-checked against `scopeUrl`; once a hop leaves the scope
 * they stay dropped. Both URLs and every hop pass through `rewriteUrl`, and scope compares a
 * `Location` as the host wrote it with the rewritten `scopeUrl`. `onCredentialsState` hears each
 * scope decision as it is made, so a caller still knows it when a later hop throws. Throws when
 * a fetch rejects or `signal` aborts.
 */
const requestFollowingRedirects = async (
  request: {
    credentials: AddByRssCredentials | null;
    headers: Record<string, string>;
    onCredentialsState: (state: AddByRSSParseCredentialsState) => void;
    scopeUrl: string;
    signal: AbortSignal;
    url: string;
  },
  deps: AddByRssDeviceFetchDeps
): Promise<DeviceRequestOutcome> => {
  const { signal } = request;
  const scopeUrl = deps.rewriteUrl(request.scopeUrl);
  let requestUrl = deps.rewriteUrl(request.url);

  let authorization: string | null = null;
  if (request.credentials !== null) {
    const decision = resolveCredentialScope(scopeUrl, requestUrl, {
      allowInsecure: deps.allowInsecureCredentials,
    });
    if (decision === 'send') {
      authorization = encodeBasicAuthorization(request.credentials);
      request.onCredentialsState('sent');
    } else {
      request.onCredentialsState(decision);
    }
  }
  const tracker = createAddByRSSRedirectCredentialTracker({
    allowInsecure: deps.allowInsecureCredentials,
    credentialsAttached: authorization !== null,
    feedUrl: scopeUrl,
  });

  const baseHeaders: Record<string, string> = { 'User-Agent': deps.userAgent, ...request.headers };
  let attachCredentials = authorization !== null;
  for (let redirects = 0; ; redirects += 1) {
    await raceAbort(deps.pacer.waitTurn(requestUrl), signal);
    const headers =
      attachCredentials && authorization !== null
        ? { ...baseHeaders, Authorization: authorization }
        : baseHeaders;
    const response = await raceAbort(
      deps.fetch(requestUrl, { headers, redirect: 'manual', signal }),
      signal
    );
    if (!REDIRECT_STATUSES.has(response.status)) {
      return { kind: 'response', response };
    }
    if (redirects >= ADD_BY_RSS_DEVICE_MAX_REDIRECTS) {
      return { kind: 'too_many_redirects' };
    }
    const location = response.headers.get('location');
    const resolvedLocation =
      location === null ? null : resolveRedirectLocation(location, requestUrl);
    if (resolvedLocation === null) {
      return { kind: 'unresolved_redirect', response };
    }
    attachCredentials = tracker.allowsCredentialsTo(resolvedLocation);
    const withheld = tracker.withheldDecision();
    if (withheld !== null) {
      request.onCredentialsState(withheld);
    }
    requestUrl = deps.rewriteUrl(resolvedLocation);
  }
};

/**
 * Runs `run` under one deadline that also ends when the caller aborts. A caller abort rejects as
 * an `AbortError`; the deadline rejects as a plain error naming it.
 */
const runWithDeadline = async <T>(
  callerSignal: AbortSignal | undefined,
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<T>
): Promise<T> => {
  if (isAborted(callerSignal)) {
    throw createAbortError();
  }
  const controller = new AbortController();
  const onCallerAbort = () => controller.abort();
  callerSignal?.addEventListener('abort', onCallerAbort);
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await run(controller.signal);
  } catch (error) {
    if (isAborted(callerSignal)) {
      throw createAbortError();
    }
    if (controller.signal.aborted) {
      throw new Error(`The Add by RSS device request passed its ${timeoutMs} ms deadline`, {
        cause: error,
      });
    }
    throw error;
  } finally {
    clearTimeout(timer);
    callerSignal?.removeEventListener('abort', onCallerAbort);
  }
};

/**
 * Fetches one file an Add by RSS feed links (its chapters JSON, a transcript) on this device,
 * through the same request path, host spacing, and deadline as the feed fetch. Credentials go only
 * where the feed's credential scope allows, checked on every hop. Throws for a URL that is not
 * http or https, more than `ADD_BY_RSS_DEVICE_MAX_REDIRECTS` redirects, a host that cannot be
 * reached, the deadline, and a caller abort; any HTTP status is returned.
 */
export const runAddByRssDeviceResourceFetch = async (
  input: AddByRssDeviceResourceInput,
  deps: AddByRssDeviceFetchDeps
): Promise<AddByRssDeviceResource> => {
  const url = canonicalHttpOrHttpsUrl(input.url);
  if (url === null) {
    throw new Error('The Add by RSS resource URL is not an http or https URL');
  }
  return runWithDeadline(input.signal, deps.timeoutMs, async (signal) => {
    const outcome = await requestFollowingRedirects(
      {
        credentials: input.credentials,
        headers: {},
        onCredentialsState: () => undefined,
        scopeUrl: input.feedUrl,
        signal,
        url,
      },
      deps
    );
    if (outcome.kind === 'too_many_redirects') {
      throw new Error(
        `The Add by RSS resource redirected more than ${ADD_BY_RSS_DEVICE_MAX_REDIRECTS} times`
      );
    }
    const { status } = outcome.response;
    if (outcome.kind === 'unresolved_redirect' || status < 200 || status >= 300) {
      return { body: '', status };
    }
    const body = await raceAbort(outcome.response.text(), signal);
    return { body, status };
  });
};

const emptyBundle = (status: AddByRSSParseStatus) => resolveAddByRssParsePayload(status, null);

/** Runs one device fetch and parse. Throws only when `input.signal` aborts. */
export const runAddByRssDeviceParse = async (
  input: AddByRssDeviceParseInput,
  deps: AddByRssDeviceParseDeps
): Promise<AddByRssDeviceParseResult> => {
  const callerSignal = input.signal;
  if (isAborted(callerSignal)) {
    throw createAbortError();
  }

  let credentialsState: AddByRSSParseCredentialsState = 'not_provided';

  const failed = (failure: {
    authChallenge?: AddByRSSParseAuthChallenge;
    httpStatus?: number;
    transportError: boolean;
  }): AddByRssDeviceParseResult => ({
    ...emptyBundle('failed'),
    ...(failure.httpStatus !== undefined
      ? { authChallenge: failure.authChallenge ?? 'none', httpStatus: failure.httpStatus }
      : {}),
    conditionalCache: null,
    credentialsState,
    failureReason: resolveAddByRSSParseFailureReason({
      authChallenge: failure.authChallenge ?? 'none',
      credentialsState,
      httpStatus: failure.httpStatus,
      transportError: failure.transportError,
    }),
    serverError: null,
    status: 'failed',
  });

  const httpFailure = (response: DeviceFetchResponse): AddByRssDeviceParseResult =>
    failed({
      authChallenge: toAddByRSSAuthChallenge(response.headers.get('www-authenticate')),
      httpStatus: response.status,
      transportError: false,
    });

  const notModified = (conditionalCache: AddByRssDeviceCache): AddByRssDeviceParseResult => ({
    ...emptyBundle('not_modified'),
    conditionalCache,
    credentialsState,
    serverError: null,
    status: 'not_modified',
  });

  const canonicalUrl = canonicalHttpOrHttpsUrl(input.feedUrl);
  if (canonicalUrl === null) {
    return failed({ transportError: false });
  }

  const cache = input.conditionalCache;
  const usableCache = isUsableDeviceCache(cache, deps.parseVersion) ? cache : null;
  const conditionalHeaders: Record<string, string> = {};
  if (usableCache !== null && usableCache.etag !== null && usableCache.etag !== '') {
    conditionalHeaders['If-None-Match'] = usableCache.etag;
  }
  if (
    usableCache !== null &&
    usableCache.lastModified !== null &&
    usableCache.lastModified !== ''
  ) {
    conditionalHeaders['If-Modified-Since'] = usableCache.lastModified;
  }

  const readFinalResponse = async (
    response: DeviceFetchResponse,
    signal: AbortSignal
  ): Promise<AddByRssDeviceParseResult> => {
    if (response.status === 304) {
      if (usableCache === null) {
        return httpFailure(response);
      }
      return notModified({
        etag: readHeader(response, 'etag') ?? usableCache.etag,
        feedHash: usableCache.feedHash,
        lastModified: readHeader(response, 'last-modified') ?? usableCache.lastModified,
      });
    }
    if (response.status < 200 || response.status >= 300) {
      return httpFailure(response);
    }

    const contentLength = readContentLength(response);
    if (contentLength !== null && contentLength > MAX_FEED_BODY_BYTES) {
      return failed({ transportError: false });
    }
    const raw = await raceAbort(response.text(), signal);
    if (raw === '') {
      return failed({ transportError: false });
    }

    const responseCache: AddByRssDeviceCache = {
      etag: readHeader(response, 'etag'),
      feedHash: hashRawFeedForDevice(raw, deps.parseVersion),
      lastModified: readHeader(response, 'last-modified'),
    };
    if (usableCache !== null && usableCache.feedHash === responseCache.feedHash) {
      return notModified(responseCache);
    }

    let payload: unknown;
    try {
      const parsedFeed = parseFeed(raw, {
        allowMissingGuid: true,
        maxFeedBodyBytes: MAX_FEED_BODY_BYTES,
      });
      if (parsedFeed === null) {
        return failed({ transportError: false });
      }
      // The server payload reaches the phone as JSON (dates as strings), and parser-mapping reads
      // that shape; mapping the same shape keeps device and server bundles identical.
      payload = JSON.parse(JSON.stringify(parsedFeed));
    } catch {
      return failed({ transportError: false });
    }

    return {
      ...resolveAddByRssParsePayload('parsed', payload),
      conditionalCache: responseCache,
      credentialsState,
      serverError: null,
      status: 'parsed',
    };
  };

  const fetchAndParse = async (signal: AbortSignal): Promise<AddByRssDeviceParseResult> => {
    const outcome = await requestFollowingRedirects(
      {
        credentials: input.credentials,
        headers: conditionalHeaders,
        onCredentialsState: (state) => {
          credentialsState = state;
        },
        scopeUrl: canonicalUrl,
        signal,
        url: canonicalUrl,
      },
      deps
    );
    switch (outcome.kind) {
      case 'response':
        return readFinalResponse(outcome.response, signal);
      case 'unresolved_redirect':
        return httpFailure(outcome.response);
      case 'too_many_redirects':
        return failed({ transportError: true });
    }
  };

  try {
    return await runWithDeadline(callerSignal, deps.timeoutMs, fetchAndParse);
  } catch {
    if (isAborted(callerSignal)) {
      throw createAbortError();
    }
    // DNS, connection, TLS, or this module's own deadline: the host could not be reached.
    return failed({ transportError: true });
  }
};
