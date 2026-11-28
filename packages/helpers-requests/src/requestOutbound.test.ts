import http from 'node:http';
import type { LookupFunction } from 'node:net';
import { Readable } from 'node:stream';

import type { InternalAxiosRequestConfig } from 'axios';
import axios, { HttpStatusCode } from 'axios';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_OUTBOUND_MAX_RESPONSE_BYTES,
  fetchForOutbound,
  requestForOutbound,
} from './_requestOutbound.js';
import { OutboundUrlBlockedError } from './outboundHttpPolicy.js';

const lookup = vi.hoisted(() =>
  vi.fn(async (hostname: string) => {
    const address = hostname === 'evil.example' ? '10.0.0.1' : '1.1.1.1';
    return [{ address, family: 4 }];
  })
);

vi.mock('node:dns', () => ({
  default: { promises: { lookup } },
  promises: { lookup },
}));

const axiosConfig = {} as InternalAxiosRequestConfig;

const okAxiosResponse = () =>
  Promise.resolve({
    status: 200,
    data: '',
    headers: {},
    statusText: 'OK',
    config: axiosConfig,
  });

function guardedLookup(agent: unknown): LookupFunction {
  if (!(agent instanceof http.Agent)) {
    throw new Error('expected an HTTP agent');
  }
  const lookupFn = agent.options.lookup;
  if (lookupFn === undefined) {
    throw new Error('expected a guarded lookup');
  }
  return lookupFn;
}

function readLookup(lookupFn: LookupFunction, hostname: string): Promise<string> {
  return new Promise((resolve, reject) => {
    lookupFn(hostname, {}, (error, address) => {
      if (error !== null) {
        reject(error);
        return;
      }
      if (typeof address === 'string') {
        resolve(address);
        return;
      }
      const first = address[0];
      if (first === undefined) {
        reject(new Error('lookup returned no address'));
        return;
      }
      resolve(first.address);
    });
  });
}

vi.mock('axios', () => ({
  default: {
    request: vi.fn(() => okAxiosResponse()),
  },
}));

describe('requestForOutbound', () => {
  const originalParserMaxFeedBodyBytes = process.env.PARSER_MAX_FEED_BODY_BYTES;

  beforeEach(() => {
    vi.mocked(axios.request).mockReset();
    vi.mocked(axios.request).mockImplementation(okAxiosResponse);
    lookup.mockReset();
    lookup.mockImplementation(async (hostname: string) => {
      const address = hostname === 'evil.example' ? '10.0.0.1' : '1.1.1.1';
      return [{ address, family: 4 }];
    });
    delete process.env.PARSER_MAX_FEED_BODY_BYTES;
  });

  afterEach(() => {
    vi.mocked(axios.request).mockClear();
    if (originalParserMaxFeedBodyBytes === undefined) {
      delete process.env.PARSER_MAX_FEED_BODY_BYTES;
    } else {
      process.env.PARSER_MAX_FEED_BODY_BYTES = originalParserMaxFeedBodyBytes;
    }
  });

  it('does not call axios when URL fails SSRF validation', async () => {
    await expect(requestForOutbound('http://127.0.0.1/')).rejects.toThrow(OutboundUrlBlockedError);
    expect(axios.request).not.toHaveBeenCalled();
  });

  it('sets maxContentLength for allowed URLs', async () => {
    await requestForOutbound('http://1.1.1.1/feed.xml');

    expect(axios.request).toHaveBeenCalledTimes(1);
    const cfg = vi.mocked(axios.request).mock.calls[0]?.[0];
    expect(cfg).toMatchObject({
      url: 'http://1.1.1.1/feed.xml',
      maxContentLength: DEFAULT_OUTBOUND_MAX_RESPONSE_BYTES,
      maxBodyLength: DEFAULT_OUTBOUND_MAX_RESPONSE_BYTES,
    });
    expect(typeof cfg?.beforeRedirect).toBe('function');
  });

  it('uses PARSER_MAX_FEED_BODY_BYTES when set', async () => {
    process.env.PARSER_MAX_FEED_BODY_BYTES = '12345';
    await requestForOutbound('http://1.1.1.1/feed.xml');

    const cfg = vi.mocked(axios.request).mock.calls[0]?.[0];
    expect(cfg).toMatchObject({
      maxContentLength: 12345,
      maxBodyLength: 12345,
    });
  });

  it('uses per-request maxResponseBytes when set', async () => {
    process.env.PARSER_MAX_FEED_BODY_BYTES = '12345';
    await requestForOutbound('http://1.1.1.1/feed.xml', { maxResponseBytes: 7777 });

    const cfg = vi.mocked(axios.request).mock.calls[0]?.[0];
    expect(cfg).toMatchObject({
      maxContentLength: 7777,
      maxBodyLength: 7777,
    });
  });

  it('injects traceparent when observability is initialized with an active span', async () => {
    const { initObservability, shutdownObservability } = await import('@podverse/observability');
    const { context, trace } = await import('@opentelemetry/api');

    initObservability({
      serviceName: 'podverse-test',
      tracesExport: 'none',
    });

    const tracer = trace.getTracer('test');
    const span = tracer.startSpan('outbound-test');
    const activeContext = trace.setSpan(context.active(), span);

    await context.with(activeContext, async () => {
      await requestForOutbound('http://1.1.1.1/feed.xml');
    });
    span.end();
    await shutdownObservability();

    const cfg = vi.mocked(axios.request).mock.calls[0]?.[0];
    const headers = cfg?.headers as Record<string, string> | undefined;
    expect(headers?.traceparent).toMatch(/^00-[0-9a-f]{32}-[0-9a-f]{16}-0[1-9a-f]$/);
  });

  it('resolves a hostname once and reuses that address for the socket', async () => {
    await requestForOutbound('http://cdn.example/feed.xml');

    expect(lookup).toHaveBeenCalledTimes(1);
    const cfg = vi.mocked(axios.request).mock.calls[0]?.[0];
    const lookupFn = guardedLookup(cfg?.httpAgent);
    await expect(readLookup(lookupFn, 'cdn.example')).resolves.toBe('1.1.1.1');
    expect(lookup).toHaveBeenCalledTimes(1);

    await expect(readLookup(lookupFn, 'evil.example')).rejects.toThrow(OutboundUrlBlockedError);
    expect(lookup).toHaveBeenCalledTimes(2);
  });

  it('rejects a private literal in beforeRedirect', async () => {
    await requestForOutbound('http://1.1.1.1/feed.xml');
    const beforeRedirect = vi.mocked(axios.request).mock.calls[0]?.[0]?.beforeRedirect;
    expect(typeof beforeRedirect).toBe('function');
    if (typeof beforeRedirect !== 'function') {
      return;
    }
    expect(() => {
      beforeRedirect(
        { href: 'http://10.0.0.1/secret' },
        { headers: {}, statusCode: HttpStatusCode.Found },
        { headers: {}, method: 'GET', url: 'http://1.1.1.1/feed.xml' }
      );
    }).toThrow(OutboundUrlBlockedError);
  });
});

describe('fetchForOutbound', () => {
  beforeEach(() => {
    vi.mocked(axios.request).mockReset();
    lookup.mockReset();
    lookup.mockImplementation(async (hostname: string) => {
      const address = hostname === 'evil.example' ? '10.0.0.1' : '1.1.1.1';
      return [{ address, family: 4 }];
    });
  });

  it('refuses a redirect to a private address', async () => {
    vi.mocked(axios.request).mockResolvedValue({
      status: 302,
      data: Readable.from([]),
      headers: { location: 'http://10.0.0.1/secret' },
      statusText: 'Found',
      config: axiosConfig,
    });

    await expect(fetchForOutbound('https://cdn.example/start')).rejects.toThrow(
      OutboundUrlBlockedError
    );
    expect(axios.request).toHaveBeenCalledTimes(1);
    expect(vi.mocked(axios.request).mock.calls[0]?.[0]).toMatchObject({ maxRedirects: 0 });
  });

  it('refuses a redirect to a hostname that resolves to a private address', async () => {
    vi.mocked(axios.request).mockResolvedValue({
      status: 302,
      data: Readable.from([]),
      headers: { location: 'http://evil.example/secret' },
      statusText: 'Found',
      config: axiosConfig,
    });

    await expect(fetchForOutbound('https://cdn.example/start')).rejects.toThrow(
      OutboundUrlBlockedError
    );
    expect(axios.request).toHaveBeenCalledTimes(1);
  });

  it('checks a redirect hostname with DNS and pins that hop', async () => {
    vi.mocked(axios.request).mockImplementation((config) => {
      const href = typeof config?.url === 'string' ? config.url : '';
      if (href.endsWith('/start')) {
        return Promise.resolve({
          status: 302,
          data: Readable.from([]),
          headers: { location: 'https://cdn.example/final' },
          statusText: 'Found',
          config: axiosConfig,
        });
      }
      return Promise.resolve({
        status: 200,
        data: Readable.from([Buffer.from('ok')]),
        headers: {},
        statusText: 'OK',
        config: axiosConfig,
      });
    });

    const response = await fetchForOutbound('https://cdn.example/start');

    expect(response.status).toBe(200);
    await expect(response.text()).resolves.toBe('ok');
    expect(axios.request).toHaveBeenCalledTimes(2);
    expect(lookup).toHaveBeenCalledTimes(2);
    expect(vi.mocked(axios.request).mock.calls[1]?.[0]?.url).toBe('https://cdn.example/final');

    const lookupFn = guardedLookup(vi.mocked(axios.request).mock.calls[1]?.[0]?.httpsAgent);
    await expect(readLookup(lookupFn, 'cdn.example')).resolves.toBe('1.1.1.1');
    expect(lookup).toHaveBeenCalledTimes(2);
  });
});
