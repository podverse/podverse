import { describe, expect, it } from 'vitest';

import type { AddByRssCredentials } from './credentials';
import type {
  AddByRssDeviceFetch,
  AddByRssDeviceParseDeps,
  AddByRssDeviceParseInput,
} from './deviceParseEngine';
import {
  buildAddByRssDeviceUserAgent,
  createAddByRssHostPacer,
  hashRawFeedForDevice,
  resolveRedirectLocation,
  runAddByRssDeviceParse,
  runAddByRssDeviceResourceFetch,
} from './deviceParseEngine';
import { encodeBasicAuthorization } from './mediaAuth';

const PARSE_VERSION = '5.6.0';
const USER_AGENT = 'PodverseNext/5.6.0 (ios)';
const FEED_URL = 'https://feeds.example.com/show/feed.rss';
const CREDENTIALS: AddByRssCredentials = { password: 'secret', username: 'listener' };

const FIXTURE = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Device Parse Fixture</title>
    <description>A feed for device parse tests.</description>
    <link>https://feeds.example.com/show</link>
    <item>
      <title>Episode One</title>
      <guid isPermaLink="false">device-parse-episode-1</guid>
      <pubDate>Fri, 09 Oct 2020 04:30:38 GMT</pubDate>
      <enclosure url="https://media.example.com/episode-1.mp3" length="1000" type="audio/mpeg"/>
    </item>
  </channel>
</rss>`;

type ScriptedResponse = {
  body?: string;
  headers?: Record<string, string>;
  status: number;
};

type ScriptStep = ScriptedResponse | 'hang' | 'reject';

type RecordedCall = {
  headers: Record<string, string>;
  redirect: string;
  url: string;
};

/** A fetch that records each call and answers from `respond`, called with the call's index. */
const createFakeFetch = (respond: (index: number, url: string) => ScriptStep) => {
  const calls: RecordedCall[] = [];
  let textReads = 0;
  const fetch: AddByRssDeviceFetch = async (url, init) => {
    calls.push({ headers: { ...init.headers }, redirect: init.redirect, url });
    const step = respond(calls.length - 1, url);
    if (step === 'reject') {
      throw new TypeError('Network request failed');
    }
    if (step === 'hang') {
      return new Promise<never>(() => undefined);
    }
    const headers = new Map(
      Object.entries(step.headers ?? {}).map(([name, value]) => [name.toLowerCase(), value])
    );
    return {
      headers: { get: (name: string) => headers.get(name.toLowerCase()) ?? null },
      status: step.status,
      text: async () => {
        textReads += 1;
        return step.body ?? '';
      },
    };
  };
  return { calls, fetch, textReads: () => textReads };
};

const sequence =
  (steps: ScriptStep[]) =>
  (index: number): ScriptStep =>
    steps[index] ?? { status: 500 };

const ok = (overrides: Partial<ScriptedResponse> = {}): ScriptedResponse => ({
  body: FIXTURE,
  status: 200,
  ...overrides,
});

const makeDeps = (
  fetch: AddByRssDeviceFetch,
  overrides: Partial<AddByRssDeviceParseDeps> = {}
): AddByRssDeviceParseDeps => ({
  allowInsecureCredentials: false,
  fetch,
  pacer: { waitTurn: async () => undefined },
  parseVersion: PARSE_VERSION,
  rewriteUrl: (url) => url,
  timeoutMs: 1000,
  userAgent: USER_AGENT,
  ...overrides,
});

const makeInput = (
  overrides: Partial<AddByRssDeviceParseInput> = {}
): AddByRssDeviceParseInput => ({
  conditionalCache: null,
  credentials: null,
  feedUrl: FEED_URL,
  ...overrides,
});

describe('runAddByRssDeviceParse', () => {
  it('parses a 200 feed and maps it the way a server payload is mapped', async () => {
    const fake = createFakeFetch(sequence([ok({ headers: { ETag: '"v1"' } })]));

    const result = await runAddByRssDeviceParse(makeInput(), makeDeps(fake.fetch));

    expect(result.status).toBe('parsed');
    expect(result.mappedFeed?.channel.channel.title).toBe('Device Parse Fixture');
    expect(result.preview.title).toBe('Device Parse Fixture');
    expect(result.preview.enclosureUrl).toBe('https://media.example.com/episode-1.mp3');
    expect(result.credentialsState).toBe('not_provided');
    expect(result.serverError).toBeNull();
    expect(result.conditionalCache?.feedHash?.startsWith(`${PARSE_VERSION}|`)).toBe(true);
    expect(result.conditionalCache?.etag).toBe('"v1"');
    expect(result.conditionalCache?.lastModified).toBeNull();
    expect(fake.calls).toHaveLength(1);
    expect(fake.calls[0]?.url).toBe(FEED_URL);
    expect(fake.calls[0]?.redirect).toBe('manual');
    expect(fake.calls[0]?.headers['User-Agent']).toBe(USER_AGENT);
    expect(fake.calls[0]?.headers.Authorization).toBeUndefined();
  });

  it('sends Basic credentials to an HTTPS feed URL in scope', async () => {
    const fake = createFakeFetch(sequence([ok()]));

    const result = await runAddByRssDeviceParse(
      makeInput({ credentials: CREDENTIALS }),
      makeDeps(fake.fetch)
    );

    expect(result.status).toBe('parsed');
    expect(result.credentialsState).toBe('sent');
    expect(fake.calls[0]?.headers.Authorization).toBe(encodeBasicAuthorization(CREDENTIALS));
  });

  it('keeps credentials on a relative redirect within the feed domain', async () => {
    const fake = createFakeFetch(
      sequence([{ headers: { Location: '../moved/feed.rss' }, status: 302 }, ok()])
    );

    const result = await runAddByRssDeviceParse(
      makeInput({ credentials: CREDENTIALS }),
      makeDeps(fake.fetch)
    );

    expect(result.status).toBe('parsed');
    expect(result.credentialsState).toBe('sent');
    expect(fake.calls[1]?.url).toBe('https://feeds.example.com/moved/feed.rss');
    expect(fake.calls[1]?.headers.Authorization).toBe(encodeBasicAuthorization(CREDENTIALS));
  });

  it('drops credentials once a hop leaves the domain, even back on the feed host', async () => {
    const fake = createFakeFetch(
      sequence([
        { headers: { Location: 'https://cdn.other.net/feed.rss' }, status: 302 },
        { headers: { Location: 'https://feeds.example.com/show/feed.rss?back=1' }, status: 302 },
        { headers: { 'WWW-Authenticate': 'Basic realm="feed"' }, status: 401 },
      ])
    );

    const result = await runAddByRssDeviceParse(
      makeInput({ credentials: CREDENTIALS }),
      makeDeps(fake.fetch)
    );

    expect(fake.calls[0]?.headers.Authorization).toBe(encodeBasicAuthorization(CREDENTIALS));
    expect(fake.calls[1]?.headers.Authorization).toBeUndefined();
    expect(fake.calls[2]?.url).toBe('https://feeds.example.com/show/feed.rss?back=1');
    expect(fake.calls[2]?.headers.Authorization).toBeUndefined();
    expect(result).toMatchObject({
      authChallenge: 'basic',
      conditionalCache: null,
      credentialsState: 'withheld_other_domain',
      failureReason: 'credentials_withheld_other_domain',
      httpStatus: 401,
      mappedFeed: null,
      serverError: null,
      status: 'failed',
    });
  });

  it('withholds credentials from an http feed when insecure credentials are not allowed', async () => {
    const fake = createFakeFetch(
      sequence([{ headers: { 'WWW-Authenticate': 'Basic' }, status: 401 }])
    );

    const result = await runAddByRssDeviceParse(
      makeInput({ credentials: CREDENTIALS, feedUrl: 'http://feeds.example.com/feed.rss' }),
      makeDeps(fake.fetch)
    );

    expect(fake.calls[0]?.headers.Authorization).toBeUndefined();
    expect(result.credentialsState).toBe('withheld_insecure');
    expect(result.failureReason).toBe('credentials_withheld_insecure');
  });

  it('classifies host failures the same way the server does', async () => {
    const basicChallenge = { headers: { 'WWW-Authenticate': 'Basic' }, status: 401 };

    const required = await runAddByRssDeviceParse(
      makeInput(),
      makeDeps(createFakeFetch(sequence([basicChallenge])).fetch)
    );
    expect(required.failureReason).toBe('credentials_required');

    const rejected = await runAddByRssDeviceParse(
      makeInput({ credentials: CREDENTIALS }),
      makeDeps(createFakeFetch(sequence([basicChallenge])).fetch)
    );
    expect(rejected.failureReason).toBe('credentials_rejected');

    const serverError = await runAddByRssDeviceParse(
      makeInput(),
      makeDeps(createFakeFetch(sequence([{ status: 500 }])).fetch)
    );
    expect(serverError).toMatchObject({
      failureReason: 'http_error',
      httpStatus: 500,
      status: 'failed',
    });
  });

  it('sends a usable cache as conditional headers and keeps it on a 304', async () => {
    const cache = {
      etag: '"v1"',
      feedHash: `${PARSE_VERSION}|abc-123`,
      lastModified: 'Wed, 01 Jan 2025 00:00:00 GMT',
    };
    const fake = createFakeFetch(sequence([{ headers: { ETag: '"v2"' }, status: 304 }]));

    const result = await runAddByRssDeviceParse(
      makeInput({ conditionalCache: cache }),
      makeDeps(fake.fetch)
    );

    expect(fake.calls[0]?.headers['If-None-Match']).toBe('"v1"');
    expect(fake.calls[0]?.headers['If-Modified-Since']).toBe('Wed, 01 Jan 2025 00:00:00 GMT');
    expect(result.status).toBe('not_modified');
    expect(result.mappedFeed).toBeNull();
    expect(result.conditionalCache).toEqual({
      etag: '"v2"',
      feedHash: cache.feedHash,
      lastModified: cache.lastModified,
    });
  });

  it('ignores a cache written by another app version and parses the feed again', async () => {
    const fake = createFakeFetch(sequence([ok()]));

    const result = await runAddByRssDeviceParse(
      makeInput({
        conditionalCache: {
          etag: '"v1"',
          feedHash: hashRawFeedForDevice(FIXTURE, '5.5.0'),
          lastModified: 'Wed, 01 Jan 2025 00:00:00 GMT',
        },
      }),
      makeDeps(fake.fetch)
    );

    expect(fake.calls[0]?.headers['If-None-Match']).toBeUndefined();
    expect(fake.calls[0]?.headers['If-Modified-Since']).toBeUndefined();
    expect(result.status).toBe('parsed');
    expect(result.mappedFeed).not.toBeNull();
  });

  it('reads an unchanged body as not modified, including a change of line endings', async () => {
    const feedHash = hashRawFeedForDevice(FIXTURE, PARSE_VERSION);
    const fake = createFakeFetch(sequence([ok({ body: FIXTURE.replace(/\n/g, '\r\n') })]));

    const result = await runAddByRssDeviceParse(
      makeInput({ conditionalCache: { etag: null, feedHash, lastModified: null } }),
      makeDeps(fake.fetch)
    );

    expect(result.status).toBe('not_modified');
    expect(result.conditionalCache).toEqual({ etag: null, feedHash, lastModified: null });
  });

  it('reports a fetch that rejects as a network failure', async () => {
    const result = await runAddByRssDeviceParse(
      makeInput(),
      makeDeps(createFakeFetch(() => 'reject').fetch)
    );

    expect(result.status).toBe('failed');
    expect(result.failureReason).toBe('network');
    expect(result.httpStatus).toBeUndefined();
    expect(result.conditionalCache).toBeNull();
  });

  it('rejects when the caller aborts, before or during the fetch', async () => {
    const preAborted = new AbortController();
    preAborted.abort();
    await expect(
      runAddByRssDeviceParse(
        makeInput({ signal: preAborted.signal }),
        makeDeps(createFakeFetch(() => 'hang').fetch)
      )
    ).rejects.toThrow();

    const duringFetch = new AbortController();
    const pending = runAddByRssDeviceParse(
      makeInput({ signal: duringFetch.signal }),
      makeDeps(createFakeFetch(() => 'hang').fetch)
    );
    duringFetch.abort();
    await expect(pending).rejects.toThrow();
  });

  it('reports one redirect past the limit as a network failure', async () => {
    const fake = createFakeFetch(() => ({ headers: { Location: '/next.rss' }, status: 302 }));

    const result = await runAddByRssDeviceParse(makeInput(), makeDeps(fake.fetch));

    expect(fake.calls).toHaveLength(11);
    expect(result.failureReason).toBe('network');
  });

  it('reports its own deadline as a network failure', async () => {
    const result = await runAddByRssDeviceParse(
      makeInput(),
      makeDeps(createFakeFetch(() => 'hang').fetch, { timeoutMs: 5 })
    );

    expect(result.status).toBe('failed');
    expect(result.failureReason).toBe('network');
  });

  it('reports a body that is not a feed as a parse failure', async () => {
    const result = await runAddByRssDeviceParse(
      makeInput(),
      makeDeps(createFakeFetch(sequence([ok({ body: '<html><body>Hi</body></html>' })])).fetch)
    );

    expect(result.status).toBe('failed');
    expect(result.failureReason).toBe('parse');
    expect(result.httpStatus).toBeUndefined();
  });

  it('refuses a body whose Content-Length exceeds the cap without reading it', async () => {
    const fake = createFakeFetch(sequence([ok({ headers: { 'Content-Length': '30000000' } })]));

    const result = await runAddByRssDeviceParse(makeInput(), makeDeps(fake.fetch));

    expect(result.failureReason).toBe('parse');
    expect(fake.textReads()).toBe(0);
  });

  it('compares redirect scope with the rewritten feed URL', async () => {
    const fake = createFakeFetch(
      sequence([{ headers: { Location: 'http://localhost:2111/b.rss' }, status: 302 }, ok()])
    );

    const result = await runAddByRssDeviceParse(
      makeInput({ credentials: CREDENTIALS, feedUrl: 'http://localhost:2111/a.rss' }),
      makeDeps(fake.fetch, {
        allowInsecureCredentials: true,
        rewriteUrl: (url) => url.replace('://localhost:', '://127.0.0.1:'),
      })
    );

    expect(fake.calls[0]?.url).toBe('http://127.0.0.1:2111/a.rss');
    expect(fake.calls[0]?.headers.Authorization).toBe(encodeBasicAuthorization(CREDENTIALS));
    expect(fake.calls[1]?.url).toBe('http://127.0.0.1:2111/b.rss');
    expect(fake.calls[1]?.headers.Authorization).toBeUndefined();
    expect(result.status).toBe('parsed');
    expect(result.credentialsState).toBe('withheld_other_domain');
  });
});

describe('runAddByRssDeviceResourceFetch', () => {
  const CHAPTERS_URL = 'https://cdn.feeds.example.com/show/chapters.json';

  it('returns the body, with credentials on an in-scope file until a hop leaves the scope', async () => {
    const fake = createFakeFetch(
      sequence([
        { headers: { Location: 'https://other.example.net/chapters.json' }, status: 302 },
        { body: '{"chapters":[]}', status: 200 },
      ])
    );

    const resource = await runAddByRssDeviceResourceFetch(
      { credentials: CREDENTIALS, feedUrl: FEED_URL, url: CHAPTERS_URL },
      makeDeps(fake.fetch)
    );

    expect(resource).toEqual({ body: '{"chapters":[]}', status: 200 });
    expect(fake.calls[0]?.url).toBe(CHAPTERS_URL);
    expect(fake.calls[0]?.redirect).toBe('manual');
    expect(fake.calls[0]?.headers.Authorization).toBe(encodeBasicAuthorization(CREDENTIALS));
    expect(fake.calls[0]?.headers['User-Agent']).toBe(USER_AGENT);
    expect(fake.calls[1]?.headers.Authorization).toBeUndefined();
  });

  it('never sends credentials to a file on another registrable domain', async () => {
    const fake = createFakeFetch(sequence([{ body: 'WEBVTT', status: 200 }]));

    await runAddByRssDeviceResourceFetch(
      { credentials: CREDENTIALS, feedUrl: FEED_URL, url: 'https://transcripts.example.org/1.vtt' },
      makeDeps(fake.fetch)
    );

    expect(fake.calls[0]?.headers.Authorization).toBeUndefined();
  });

  it('returns a status outside 2xx without reading the body', async () => {
    const fake = createFakeFetch(sequence([{ body: 'Not found', status: 404 }]));

    const resource = await runAddByRssDeviceResourceFetch(
      { credentials: null, feedUrl: FEED_URL, url: CHAPTERS_URL },
      makeDeps(fake.fetch)
    );

    expect(resource).toEqual({ body: '', status: 404 });
    expect(fake.textReads()).toBe(0);
  });

  it('throws when the host cannot be reached, the deadline passes, or redirects never end', async () => {
    const input = { credentials: null, feedUrl: FEED_URL, url: CHAPTERS_URL };
    await expect(
      runAddByRssDeviceResourceFetch(input, makeDeps(createFakeFetch(() => 'reject').fetch))
    ).rejects.toThrow();
    await expect(
      runAddByRssDeviceResourceFetch(
        input,
        makeDeps(createFakeFetch(() => 'hang').fetch, { timeoutMs: 5 })
      )
    ).rejects.toThrow('deadline');
    await expect(
      runAddByRssDeviceResourceFetch(
        input,
        makeDeps(
          createFakeFetch(() => ({ headers: { Location: '/next.json' }, status: 302 })).fetch
        )
      )
    ).rejects.toThrow('redirected more than');
  });
});

describe('resolveRedirectLocation', () => {
  const base = 'https://feeds.example.com/shows/a/index.rss?page=1';

  it('resolves absolute, protocol-relative, root-relative, and path-relative references', () => {
    expect(resolveRedirectLocation('https://other.example.net/feed.rss', base)).toBe(
      'https://other.example.net/feed.rss'
    );
    expect(resolveRedirectLocation('//cdn.example.com/feed.rss', base)).toBe(
      'https://cdn.example.com/feed.rss'
    );
    expect(resolveRedirectLocation('/moved/feed.rss', base)).toBe(
      'https://feeds.example.com/moved/feed.rss'
    );
    expect(resolveRedirectLocation('../feed.rss', base)).toBe(
      'https://feeds.example.com/shows/feed.rss'
    );
  });

  it('drops a fragment', () => {
    expect(resolveRedirectLocation('/feed.rss#top', base)).toBe(
      'https://feeds.example.com/feed.rss'
    );
    expect(resolveRedirectLocation('https://other.example.net/feed.rss#top', base)).toBe(
      'https://other.example.net/feed.rss'
    );
  });

  it('returns null for a scheme other than http or https', () => {
    expect(resolveRedirectLocation('ftp://files.example.com/feed.rss', base)).toBeNull();
  });
});

describe('createAddByRssHostPacer', () => {
  const createClock = () => {
    let nowMs = 1_000;
    const sleeps: number[] = [];
    return {
      now: () => nowMs,
      sleep: async (ms: number) => {
        sleeps.push(ms);
        nowMs += ms;
      },
      sleeps,
    };
  };

  it('spaces two wavlake requests in a row by 5 seconds', async () => {
    const clock = createClock();
    const pacer = createAddByRssHostPacer({ now: clock.now, sleep: clock.sleep });

    await pacer.waitTurn('https://wavlake.com/feed/music/one');
    await pacer.waitTurn('https://wavlake.com/feed/music/two');

    expect(clock.sleeps).toEqual([5000]);
  });

  it('never waits for a host without a spacing rule', async () => {
    const clock = createClock();
    const pacer = createAddByRssHostPacer({ now: clock.now, sleep: clock.sleep });

    await pacer.waitTurn(FEED_URL);
    await pacer.waitTurn(FEED_URL);

    expect(clock.sleeps).toEqual([]);
  });
});

describe('buildAddByRssDeviceUserAgent', () => {
  it('names the app without spaces, its version, and the platform', () => {
    expect(
      buildAddByRssDeviceUserAgent({
        appName: 'Podverse Next',
        appVersion: '5.6.0',
        platform: 'ios',
      })
    ).toBe('PodverseNext/5.6.0 (ios)');
  });
});
