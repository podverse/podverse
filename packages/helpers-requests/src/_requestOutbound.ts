import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';
import { Readable } from 'node:stream';

import type { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios from 'axios';

import { DEFAULT_HTTP_TIMEOUT_MS, resolveParserMaxFeedBodyBytes } from '@podverse/helpers';
import { injectTraceContext } from '@podverse/observability';

import type { RequestConfig } from './_request.js';
import type { OutboundAddress, OutboundConnectionTarget } from './outboundHttpPolicy.js';
import {
  assertIpLiteralAllowed,
  outboundHostKey,
  OutboundUrlBlockedError,
  resolveOutboundFetchTarget,
  resolveOutboundHostname,
  validateOutboundRedirectLocation,
} from './outboundHttpPolicy.js';

/** Max response body size for outbound (RSS/chapters) fetches — guards memory use on hostile endpoints. */
export const DEFAULT_OUTBOUND_MAX_RESPONSE_BYTES = resolveParserMaxFeedBodyBytes(undefined);

const MAX_FETCH_REDIRECTS = 20;
const SENSITIVE_HEADERS = /^(?:authorization|proxy-authorization|cookie)$/i;

export type OutboundRequestConfig = RequestConfig & {
  maxResponseBytes?: number;
};

export type FetchOutboundRedirect = 'error' | 'follow' | 'manual';

export type FetchOutboundOptions = {
  body?: string;
  /**
   * Addresses already accepted for this exact URL. A matching target skips a second lookup.
   * The socket still connects to one of those addresses.
   */
  connection?: OutboundConnectionTarget;
  headers?: Record<string, string>;
  maxBodyBytes?: number;
  method?: string;
  redirect?: FetchOutboundRedirect;
  timeoutMs?: number;
};

type PinnedAgents = {
  destroy: () => void;
  httpAgent: http.Agent;
  httpsAgent: https.Agent;
  lookup: LookupFunction;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function selectAddresses(
  addresses: readonly OutboundAddress[],
  family: number | undefined
): OutboundAddress[] {
  if (family !== 4 && family !== 6) {
    return [...addresses];
  }
  return addresses.filter((entry) => entry.family === family);
}

function deliverAddresses(
  callback: (
    error: NodeJS.ErrnoException | null,
    address: string | { address: string; family: number }[],
    family?: number
  ) => void,
  options: { all?: boolean; family?: number },
  addresses: readonly OutboundAddress[],
  hostname: string
): void {
  const selected = selectAddresses(addresses, options.family);
  const first = selected[0];
  if (first === undefined) {
    callback(
      new OutboundUrlBlockedError(`No addresses resolved for host: ${hostname}`),
      '',
      4
    );
    return;
  }
  if (options.all === true) {
    callback(
      null,
      selected.map((entry) => ({ address: entry.address, family: entry.family }))
    );
    return;
  }
  callback(null, first.address, first.family);
}

function reportLookupError(
  callback: (
    error: NodeJS.ErrnoException | null,
    address: string | { address: string; family: number }[],
    family?: number
  ) => void,
  error: unknown
): void {
  const failure = error instanceof Error ? error : new Error(String(error));
  callback(failure, '', 4);
}

/**
 * Socket lookup for a guarded client. The connected address is one the guard accepted.
 * Host and TLS server name stay the URL hostname.
 */
function createGuardedLookup(target: OutboundConnectionTarget): LookupFunction {
  const pins = new Map<string, readonly OutboundAddress[]>([[target.hostname, target.addresses]]);
  return (hostname, options, callback) => {
    const key = outboundHostKey(hostname);
    const pinned = pins.get(key);
    if (pinned !== undefined) {
      deliverAddresses(callback, options, pinned, hostname);
      return;
    }
    void resolveOutboundHostname(key)
      .then((addresses) => {
        pins.set(key, addresses);
        deliverAddresses(callback, options, addresses, hostname);
      })
      .catch((error: unknown) => {
        reportLookupError(callback, error);
      });
  };
}

function createPinnedLookup(target: OutboundConnectionTarget): LookupFunction {
  return (hostname, options, callback) => {
    if (outboundHostKey(hostname) !== target.hostname) {
      callback(
        new OutboundUrlBlockedError('Outbound connection host is not the guarded host'),
        '',
        4
      );
      return;
    }
    deliverAddresses(callback, options, target.addresses, hostname);
  };
}

function createAgents(lookup: LookupFunction): PinnedAgents {
  const httpAgent = new http.Agent({ keepAlive: false, lookup });
  const httpsAgent = new https.Agent({ keepAlive: false, lookup });
  return {
    destroy: () => {
      httpAgent.destroy();
      httpsAgent.destroy();
    },
    httpAgent,
    httpsAgent,
    lookup,
  };
}

function isSubdomain(subdomain: string, domain: string): boolean {
  const dot = subdomain.length - domain.length - 1;
  return dot > 0 && subdomain.charAt(dot) === '.' && subdomain.endsWith(domain);
}

function crossesTrustBoundary(currentHref: string, nextHref: string): boolean {
  const current = new URL(currentHref);
  const next = new URL(nextHref);
  const protocolDowngrade = next.protocol !== current.protocol && next.protocol !== 'https:';
  const hostChanged = next.host !== current.host && !isSubdomain(next.host, current.host);
  return protocolDowngrade || hostChanged;
}

function deleteHeaders(headers: Record<string, string>, pattern: RegExp): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (!pattern.test(key)) {
      next[key] = value;
    }
  }
  return next;
}

function isRedirectStatus(status: number): boolean {
  return status === 301 || status === 302 || status === 303 || status === 307 || status === 308;
}

function switchesToGet(status: number, method: string): boolean {
  const normalized = method.toUpperCase();
  if (normalized === 'GET' || normalized === 'HEAD') {
    return false;
  }
  return status === 301 || status === 302 || status === 303;
}

function headerSource(headers: unknown): Record<string, unknown> | undefined {
  if (!isRecord(headers)) {
    return undefined;
  }
  const toJSON = headers.toJSON;
  if (typeof toJSON === 'function') {
    const json: unknown = toJSON.call(headers);
    if (isRecord(json)) {
      return json;
    }
  }
  return headers;
}

function headerEntries(headers: unknown): Array<[string, string]> {
  const source = headerSource(headers);
  if (source === undefined) {
    return [];
  }
  const entries: Array<[string, string]> = [];
  for (const [key, value] of Object.entries(source)) {
    if (typeof value === 'string') {
      entries.push([key, value]);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      entries.push([key, String(value)]);
    } else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === 'string') {
          entries.push([key, item]);
        }
      }
    }
  }
  return entries;
}

function headerValue(headers: unknown, name: string): string | undefined {
  if (isRecord(headers)) {
    const getter = headers.get;
    if (typeof getter === 'function') {
      const value: unknown = getter.call(headers, name);
      if (typeof value === 'string' && value.trim() !== '') {
        return value;
      }
      if (Array.isArray(value)) {
        const first = value[0];
        if (typeof first === 'string' && first.trim() !== '') {
          return first;
        }
      }
    }
  }
  const wanted = name.toLowerCase();
  for (const [key, value] of headerEntries(headers)) {
    if (key.toLowerCase() === wanted && value.trim() !== '') {
      return value;
    }
  }
  return undefined;
}

function headersToWeb(headers: unknown): Headers {
  const web = new Headers();
  for (const [key, value] of headerEntries(headers)) {
    web.append(key, value);
  }
  web.delete('content-encoding');
  return web;
}

function discardBody(data: unknown): void {
  if (data instanceof Readable) {
    data.destroy();
  }
}

function asBuffer(chunk: unknown): Buffer {
  if (Buffer.isBuffer(chunk)) {
    return chunk;
  }
  if (chunk instanceof Uint8Array) {
    return Buffer.from(chunk);
  }
  if (typeof chunk === 'string') {
    return Buffer.from(chunk);
  }
  return Buffer.alloc(0);
}

async function readBody(data: unknown, maxBodyBytes: number | undefined): Promise<Uint8Array> {
  if (maxBodyBytes === 0) {
    discardBody(data);
    return Buffer.alloc(0);
  }
  if (!(data instanceof Readable)) {
    if (typeof data === 'string') {
      const encoded = Buffer.from(data);
      if (maxBodyBytes !== undefined && encoded.byteLength > maxBodyBytes) {
        return encoded.subarray(0, maxBodyBytes);
      }
      return encoded;
    }
    if (data instanceof Uint8Array) {
      if (maxBodyBytes !== undefined && data.byteLength > maxBodyBytes) {
        return data.subarray(0, maxBodyBytes);
      }
      return data;
    }
    return Buffer.alloc(0);
  }

  const chunks: Buffer[] = [];
  let received = 0;
  try {
    for await (const chunk of data) {
      const buffer = asBuffer(chunk);
      if (maxBodyBytes === undefined) {
        chunks.push(buffer);
        received += buffer.byteLength;
        continue;
      }
      const room = maxBodyBytes - received;
      if (room <= 0) {
        data.destroy();
        break;
      }
      const piece = buffer.byteLength > room ? buffer.subarray(0, room) : buffer;
      if (piece.byteLength > 0) {
        chunks.push(piece);
        received += piece.byteLength;
      }
      if (received >= maxBodyBytes) {
        data.destroy();
        break;
      }
    }
  } catch (error) {
    if (data.destroyed) {
      return Buffer.concat(chunks);
    }
    throw error;
  }
  return Buffer.concat(chunks);
}

async function connectionFor(
  url: string,
  connection: OutboundConnectionTarget | undefined
): Promise<OutboundConnectionTarget> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return resolveOutboundFetchTarget(url);
  }
  if (
    connection !== undefined &&
    connection.href === parsed.href &&
    connection.hostname === outboundHostKey(parsed.hostname) &&
    connection.addresses.length > 0
  ) {
    for (const entry of connection.addresses) {
      assertIpLiteralAllowed(entry.address);
    }
    return connection;
  }
  return resolveOutboundFetchTarget(url);
}

function abortError(): Error {
  const error = new Error('The operation was aborted');
  error.name = 'AbortError';
  return error;
}

async function fetchOutboundOnce(
  target: OutboundConnectionTarget,
  method: string,
  headers: Record<string, string>,
  body: string | undefined,
  signal: AbortSignal | undefined
): Promise<{ agents: PinnedAgents; response: AxiosResponse<unknown> }> {
  const agents = createAgents(createPinnedLookup(target));
  try {
    const response = await axios.request<unknown>({
      data: body,
      decompress: true,
      headers,
      httpAgent: agents.httpAgent,
      httpsAgent: agents.httpsAgent,
      maxBodyLength: -1,
      maxContentLength: -1,
      maxRedirects: 0,
      method,
      responseType: 'stream',
      signal,
      url: target.href,
      validateStatus: () => true,
    });
    return { agents, response };
  } catch (error) {
    agents.destroy();
    throw error;
  }
}

/**
 * Fetches a URL the guard has accepted. Each hop is resolved once, and the socket
 * connects to an address from that resolution. Redirects run the same check.
 */
export async function fetchForOutbound(
  url: string,
  options?: FetchOutboundOptions
): Promise<Response> {
  const redirectMode = options?.redirect ?? 'follow';
  const timeoutMs = options?.timeoutMs;
  const controller = new AbortController();
  let timedOut = false;
  const timeoutId =
    timeoutMs !== undefined && timeoutMs > 0
      ? setTimeout(() => {
          timedOut = true;
          controller.abort();
        }, timeoutMs)
      : undefined;

  let currentUrl = url;
  let method = options?.method ?? 'GET';
  let body = options?.body;
  const headers: Record<string, string> = { ...(options?.headers ?? {}) };
  injectTraceContext(headers);
  let connection = options?.connection;

  try {
    for (let hop = 0; hop <= MAX_FETCH_REDIRECTS; hop += 1) {
      const target = await connectionFor(currentUrl, connection);
      connection = undefined;
      const { agents, response } = await fetchOutboundOnce(
        target,
        method,
        headers,
        body,
        timeoutId === undefined ? undefined : controller.signal
      );
      try {
        const status = response.status;
        const follow =
          redirectMode === 'follow' && isRedirectStatus(status) && hop < MAX_FETCH_REDIRECTS;
        if (redirectMode === 'error' && isRedirectStatus(status)) {
          discardBody(response.data);
          throw new OutboundUrlBlockedError('Redirect is not allowed');
        }
        if (!follow) {
          if (redirectMode === 'follow' && isRedirectStatus(status)) {
            discardBody(response.data);
            throw new OutboundUrlBlockedError('Too many outbound redirects');
          }
          const bytes = await readBody(response.data, options?.maxBodyBytes);
          return new Response(bytes, {
            headers: headersToWeb(response.headers),
            status,
            statusText: response.statusText,
          });
        }

        const location = headerValue(response.headers, 'location');
        discardBody(response.data);
        if (location === undefined) {
          throw new OutboundUrlBlockedError('Redirect missing target URL');
        }
        let nextUrl: string;
        try {
          nextUrl = new URL(location, target.href).href;
        } catch {
          throw new OutboundUrlBlockedError(`Invalid redirect URL: ${location}`);
        }
        if (crossesTrustBoundary(target.href, nextUrl)) {
          const stripped = deleteHeaders(headers, SENSITIVE_HEADERS);
          for (const key of Object.keys(headers)) {
            delete headers[key];
          }
          Object.assign(headers, stripped);
        }
        if (switchesToGet(status, method)) {
          method = 'GET';
          body = undefined;
          const withoutEntity = deleteHeaders(headers, /^content-/i);
          for (const key of Object.keys(headers)) {
            delete headers[key];
          }
          Object.assign(headers, withoutEntity);
        }
        currentUrl = nextUrl;
      } finally {
        agents.destroy();
      }
    }
    throw new OutboundUrlBlockedError('Too many outbound redirects');
  } catch (error) {
    if (timedOut) {
      throw abortError();
    }
    throw error;
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

const requestOutboundInternal = async <T>(
  url: string,
  requestConfig?: OutboundRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<AxiosResponse<T>> => {
  const target = await resolveOutboundFetchTarget(url);
  const agents = createAgents(createGuardedLookup(target));
  const limitBytes = resolveParserMaxFeedBodyBytes(process.env.PARSER_MAX_FEED_BODY_BYTES);
  const controller = abort?.controller ?? new AbortController();
  const timeoutMs = abort?.timeoutMs ?? DEFAULT_HTTP_TIMEOUT_MS;

  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  try {
    const {
      userAgent,
      maxResponseBytes,
      beforeRedirect: userBeforeRedirect,
      signal: _ignoreUserSignal,
      ...rest
    } = requestConfig ?? {};
    const method = rest.method || 'GET';
    const isJSONRequest = method.toUpperCase() === 'POST' || method.toUpperCase() === 'PUT';

    const traceHeaders: Record<string, string> = {};
    injectTraceContext(traceHeaders);

    const axiosConfig: AxiosRequestConfig = {
      url: target.href,
      method,
      ...rest,
      headers: {
        ...traceHeaders,
        ...(userAgent ? { 'User-Agent': userAgent } : {}),
        ...(isJSONRequest ? { 'Content-Type': 'application/json' } : {}),
        ...rest.headers,
      },
      maxContentLength: maxResponseBytes ?? limitBytes,
      maxBodyLength: maxResponseBytes ?? limitBytes,
      httpAgent: agents.httpAgent,
      httpsAgent: agents.httpsAgent,
      beforeRedirect: (redirectOptions, responseDetails, requestDetails) => {
        validateOutboundRedirectLocation(redirectOptions);
        if (typeof userBeforeRedirect === 'function') {
          userBeforeRedirect(redirectOptions, responseDetails, requestDetails);
        }
      },
      signal: controller.signal,
    };

    return await axios.request<T>(axiosConfig);
  } finally {
    clearTimeout(timeoutId);
    agents.destroy();
  }
};

/** Outbound-only: SSRF policy, redirect re-validation, response size limit, default timeout when abort is omitted. */
export const requestForOutbound = async <T>(
  url: string,
  requestConfig?: OutboundRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T }> => {
  const response = await requestOutboundInternal<T>(url, requestConfig, abort);
  return { status: response.status, data: response.data };
};

export const requestWithHeadersForOutbound = async <T>(
  url: string,
  requestConfig?: OutboundRequestConfig,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T; headers: AxiosResponse<T>['headers'] }> => {
  const response = await requestOutboundInternal<T>(url, requestConfig, abort);
  return {
    status: response.status,
    data: response.data,
    headers: response.headers,
  };
};

/** Same as requestWithUserAgent with outbound guardrails (parser/worker RSS and chapter fetches). */
export const requestWithUserAgentForOutbound = async <T>(
  url: string,
  requestConfig: OutboundRequestConfig | undefined,
  userAgent: string,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T }> => {
  return requestForOutbound<T>(url, { ...requestConfig, userAgent }, abort);
};

/** Same as requestWithHeadersWithUserAgent with outbound guardrails. */
export const requestWithHeadersWithUserAgentForOutbound = async <T>(
  url: string,
  requestConfig: OutboundRequestConfig | undefined,
  userAgent: string,
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  }
): Promise<{ status: number; data: T; headers: AxiosResponse<T>['headers'] }> => {
  return requestWithHeadersForOutbound<T>(url, { ...requestConfig, userAgent }, abort);
};
