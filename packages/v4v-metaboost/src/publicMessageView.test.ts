import { afterEach, describe, expect, it, vi } from 'vitest';

import type { MbrssMessagesScope } from './boostEligibility.js';
import type { MetaBoost } from './metaBoost.js';
import type { PublicBoostMessage } from './publicMessages.js';
import type {
  PublicBoostMessagesCapabilityStatus,
  PublicBoostMessagesScopeType,
} from './publicMessageView.js';
import {
  createBoostMessagesPageFetcher,
  createPublicBoostMessagesPageFetcher,
  formatPublicBoostAmountLine,
  resolvePublicBoostBreadcrumbTarget,
  toPublicBoostMessageRow,
} from './publicMessageView.js';

const amountLabels = {
  satoshisDenominationLabel: 'sats',
  btcNonSatoshiSuffix: 'BTC',
};

const rowOptions = {
  locale: 'en-US',
  anonymousLabel: 'Anonymous',
  headingFallback: 'Heading',
  currentPodcastGuid: 'pod-current',
  satoshisDenominationLabel: 'sats',
  btcNonSatoshiSuffix: 'BTC',
};

const message = (overrides: Partial<PublicBoostMessage> = {}): PublicBoostMessage => ({
  id: 'id-1',
  messageGuid: 'message-guid-1',
  currency: 'BTC',
  amount: '1000',
  amountUnit: 'satoshis',
  appName: '',
  senderName: 'Ada',
  body: null,
  createdAt: '2026-01-15T18:30:00.000Z',
  sourceBucketContext: null,
  breadcrumbContext: null,
  ...overrides,
});

const metaBoost: MetaBoost = {
  node: 'https://api.example.com/v1/s/mbrss-v1/boost/abc',
  standard: 'mbrss-v1',
};

const fetcherInput = (overrides: {
  fetchAllowed?: boolean;
  capabilityStatus?: PublicBoostMessagesCapabilityStatus;
  publicMessagesUrl?: string | null;
  messagesScope?: MbrssMessagesScope | null;
  scopeType?: PublicBoostMessagesScopeType;
}) => ({
  fetchAllowed: true,
  metaBoost,
  messagesScope: { type: 'channel' as const, podcastGuid: 'pod-guid' },
  capabilityStatus: 'success' as const,
  publicMessagesUrl: 'https://api.example.com/v1/custom/mbrss-v1/messages/public/bucket123',
  scopeType: 'channel' as const,
  ...overrides,
});

describe('formatPublicBoostAmountLine', () => {
  it('uses the passed denomination label for a satoshis BTC amount', () => {
    expect(
      formatPublicBoostAmountLine(
        { amount: '1000', currency: 'BTC', amountUnit: 'satoshis' },
        'en-US',
        amountLabels
      )
    ).toBe('1000 sats');
  });

  it('uses the passed BTC token for a non-satoshi BTC amount', () => {
    expect(
      formatPublicBoostAmountLine(
        { amount: '0.001', currency: 'BTC', amountUnit: 'btc' },
        'en-US',
        amountLabels
      )
    ).toBe('0.001 BTC');
  });

  it('formats a numeric USD amount as an en-US currency string', () => {
    expect(
      formatPublicBoostAmountLine(
        { amount: '12.5', currency: 'USD', amountUnit: null },
        'en-US',
        amountLabels
      )
    ).toBe('$12.50');
  });

  it('joins a non-numeric USD amount with USD', () => {
    expect(
      formatPublicBoostAmountLine(
        { amount: 'abc', currency: 'USD', amountUnit: null },
        'en-US',
        amountLabels
      )
    ).toBe('abc USD');
  });

  it('joins an unknown currency with its amount and unit', () => {
    expect(
      formatPublicBoostAmountLine(
        { amount: '5', currency: 'EUR', amountUnit: 'cents' },
        'en-US',
        amountLabels
      )
    ).toBe('5 EUR cents');
  });

  it('returns null for a blank amount', () => {
    expect(
      formatPublicBoostAmountLine(
        { amount: '   ', currency: 'BTC', amountUnit: 'satoshis' },
        'en-US',
        amountLabels
      )
    ).toBeNull();
  });
});

describe('createBoostMessagesPageFetcher request paths', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const stubMessagesFetch = () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      ok: true,
      json: async () => ({
        messages: [],
        page: 1,
        limit: 20,
        total: 0,
        totalPages: 0,
      }),
    });
    vi.stubGlobal('fetch', fetchMock);
    return fetchMock;
  };

  const requestPathname = (fetchMock: ReturnType<typeof vi.fn>): string => {
    const requestUrl = fetchMock.mock.calls[0]?.[0];
    if (typeof requestUrl !== 'string') {
      throw new Error('fetch was not called with a URL string');
    }
    return new URL(requestUrl).pathname;
  };

  it('requests artist and album messages on the channel path', async () => {
    const fetchMock = stubMessagesFetch();
    const publicMessagesUrl =
      'https://api.example.com/v1/custom/mbrss-v1/messages/public/bucket123';

    const channelScopeTypes: ReadonlyArray<'artist' | 'album'> = ['artist', 'album'];
    for (const scopeType of channelScopeTypes) {
      fetchMock.mockClear();
      const fetcher = createBoostMessagesPageFetcher({
        type: 'mbrss-v1',
        publicMessagesUrl,
        scope: { type: scopeType, podcastGuid: 'pod-guid' },
      });
      await fetcher({ page: 1, limit: 20 });
      expect(requestPathname(fetchMock).endsWith('/channel/pod-guid')).toBe(true);
    }
  });

  it('requests track and livestream messages on the item path', async () => {
    const fetchMock = stubMessagesFetch();
    const publicMessagesUrl =
      'https://api.example.com/v1/custom/mbrss-v1/messages/public/bucket123';

    const itemScopeTypes: ReadonlyArray<'track' | 'livestream'> = ['track', 'livestream'];
    for (const scopeType of itemScopeTypes) {
      fetchMock.mockClear();
      const fetcher = createBoostMessagesPageFetcher({
        type: 'mbrss-v1',
        publicMessagesUrl,
        scope: { type: scopeType, itemGuid: 'item-guid' },
      });
      await fetcher({ page: 1, limit: 20 });
      expect(requestPathname(fetchMock).endsWith('/item/item-guid')).toBe(true);
    }
  });
});

describe('createPublicBoostMessagesPageFetcher', () => {
  it('returns null when messages cannot be fetched for this scope', () => {
    expect(
      createPublicBoostMessagesPageFetcher(fetcherInput({ capabilityStatus: 'loading' }))
    ).toBeNull();
    expect(
      createPublicBoostMessagesPageFetcher(fetcherInput({ publicMessagesUrl: null }))
    ).toBeNull();
    expect(createPublicBoostMessagesPageFetcher(fetcherInput({ fetchAllowed: false }))).toBeNull();
    expect(
      createPublicBoostMessagesPageFetcher(
        fetcherInput({
          scopeType: 'channel',
          messagesScope: { type: 'item', itemGuid: 'item-guid' },
        })
      )
    ).toBeNull();
  });
});

describe('resolvePublicBoostBreadcrumbTarget', () => {
  it('returns item when a sub-bucket message has an item guid', () => {
    expect(
      resolvePublicBoostBreadcrumbTarget(
        message({
          breadcrumbContext: {
            level: 'item',
            podcastGuid: 'pod-other',
            podcastLabel: 'Show',
            itemGuid: 'item-guid',
            itemLabel: 'Episode',
            isSubBucket: true,
          },
        }),
        'pod-current'
      )
    ).toEqual({ kind: 'item', itemGuid: 'item-guid' });
  });

  it('returns channel when the podcast guids match and there is no item guid', () => {
    expect(
      resolvePublicBoostBreadcrumbTarget(
        message({
          breadcrumbContext: {
            level: 'channel',
            podcastGuid: 'pod-current',
            podcastLabel: 'Show',
            itemGuid: null,
            itemLabel: null,
            isSubBucket: true,
          },
        }),
        'pod-current'
      )
    ).toEqual({ kind: 'channel' });
  });

  it('returns none when the message is not a sub-bucket or the podcast guids differ', () => {
    expect(
      resolvePublicBoostBreadcrumbTarget(
        message({
          breadcrumbContext: {
            level: 'channel',
            podcastGuid: 'pod-current',
            podcastLabel: 'Show',
            itemGuid: null,
            itemLabel: null,
            isSubBucket: false,
          },
        }),
        'pod-current'
      )
    ).toEqual({ kind: 'none' });
    expect(
      resolvePublicBoostBreadcrumbTarget(
        message({
          breadcrumbContext: {
            level: 'channel',
            podcastGuid: 'pod-other',
            podcastLabel: 'Show',
            itemGuid: null,
            itemLabel: null,
            isSubBucket: true,
          },
        }),
        'pod-current'
      )
    ).toEqual({ kind: 'none' });
  });
});

describe('toPublicBoostMessageRow', () => {
  it('uses the anonymous label when the sender name is blank', () => {
    expect(toPublicBoostMessageRow(message({ senderName: '   ' }), rowOptions).senderName).toBe(
      'Anonymous'
    );
  });

  it('shows an em dash when the message has an app name and no amount', () => {
    const row = toPublicBoostMessageRow(message({ amount: '', appName: 'Fountain' }), rowOptions);
    expect(row.showAmountRow).toBe(true);
    expect(row.amountPrimary).toBe('\u2014');
  });

  it('hides the amount row when the amount and app name are blank', () => {
    const row = toPublicBoostMessageRow(message({ amount: ' ', appName: '   ' }), rowOptions);
    expect(row.showAmountRow).toBe(false);
  });

  it('keeps sub-bucket labels when the podcast guid does not match', () => {
    const row = toPublicBoostMessageRow(
      message({
        breadcrumbContext: {
          level: 'channel',
          podcastGuid: 'pod-other',
          podcastLabel: 'Other show',
          itemGuid: null,
          itemLabel: 'Episode',
          isSubBucket: true,
        },
      }),
      rowOptions
    );
    expect(row.breadcrumb).not.toBeNull();
    expect(row.breadcrumb?.target.kind).toBe('none');
  });
});
