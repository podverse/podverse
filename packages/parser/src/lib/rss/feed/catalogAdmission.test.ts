import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  catalogAllowlistTableAdmitsMock,
  getAndParseRSSFeedMock,
  getOptionalCatalogAdmissionPolicyMock,
  getOptionalIndexProviderMock,
  loggerWarnMock,
} = vi.hoisted(() => ({
  catalogAllowlistTableAdmitsMock: vi.fn(async () => false),
  getAndParseRSSFeedMock: vi.fn(),
  getOptionalCatalogAdmissionPolicyMock: vi.fn(),
  getOptionalIndexProviderMock: vi.fn(),
  loggerWarnMock: vi.fn(),
}));

vi.mock('@parser/context.js', () => ({
  getOptionalCatalogAdmissionPolicy: getOptionalCatalogAdmissionPolicyMock,
  getOptionalIndexProvider: getOptionalIndexProviderMock,
}));

vi.mock('@parser/factories/loggerService.js', () => ({
  loggerService: {
    warn: loggerWarnMock,
  },
}));

vi.mock('../parser.js', () => ({
  getAndParseRSSFeed: getAndParseRSSFeedMock,
}));

vi.mock('@podverse/orm', () => ({
  catalogAllowlistTableAdmits: catalogAllowlistTableAdmitsMock,
}));

import type { FeedNotInCatalogReason } from '../errors.js';
import { FeedNotInCatalogError } from '../errors.js';
import { assertCatalogAdmitsNewFeed } from './catalogAdmission.js';

const url = 'https://example.com/feed.xml';

async function admit(podcastIndexId: number, catalogAllowlistSourcePodcastIndexId?: number) {
  await assertCatalogAdmitsNewFeed({
    url,
    podcastIndexId,
    catalogAllowlistSourcePodcastIndexId,
  });
}

async function expectRefused(
  podcastIndexId: number,
  reason: FeedNotInCatalogReason,
  catalogAllowlistSourcePodcastIndexId?: number
) {
  const refused = await admit(podcastIndexId, catalogAllowlistSourcePodcastIndexId).then(
    () => null,
    (error: unknown) => error
  );
  expect(refused).toBeInstanceOf(FeedNotInCatalogError);
  if (!(refused instanceof FeedNotInCatalogError)) {
    return;
  }
  expect(refused.reason).toBe(reason);
}

function foundMedium(medium: string | null) {
  return { status: 'found' as const, value: { medium } };
}

describe('assertCatalogAdmitsNewFeed', () => {
  beforeEach(() => {
    getOptionalCatalogAdmissionPolicyMock.mockReset();
    getOptionalIndexProviderMock.mockReset();
    getAndParseRSSFeedMock.mockReset();
    loggerWarnMock.mockReset();
    catalogAllowlistTableAdmitsMock.mockReset();
    catalogAllowlistTableAdmitsMock.mockResolvedValue(false);
  });

  it('resolves without calling the index provider when no policy was passed', async () => {
    getOptionalCatalogAdmissionPolicyMock.mockReturnValue(null);

    await admit(3);

    expect(getOptionalIndexProviderMock).not.toHaveBeenCalled();
  });

  it('resolves without calling the index provider when music is on and the allowlist is unset', async () => {
    getOptionalCatalogAdmissionPolicyMock.mockReturnValue({
      musicEnabled: true,
      podcastIndexIdAllowlist: null,
    });

    await admit(3);

    expect(getOptionalIndexProviderMock).not.toHaveBeenCalled();
  });

  it('rejects an id that is not on the allowlist without calling the index provider', async () => {
    getOptionalCatalogAdmissionPolicyMock.mockReturnValue({
      musicEnabled: true,
      podcastIndexIdAllowlist: [1, 2],
    });

    await expectRefused(3, 'not_on_allowlist');

    expect(getOptionalIndexProviderMock).not.toHaveBeenCalled();
    expect(catalogAllowlistTableAdmitsMock).toHaveBeenCalledWith([3]);
  });

  it('admits an id that is only on the allowlist table', async () => {
    getOptionalCatalogAdmissionPolicyMock.mockReturnValue({
      musicEnabled: true,
      podcastIndexIdAllowlist: [1],
    });
    catalogAllowlistTableAdmitsMock.mockResolvedValue(true);

    await admit(9);

    expect(catalogAllowlistTableAdmitsMock).toHaveBeenCalledWith([9]);
    expect(getOptionalIndexProviderMock).not.toHaveBeenCalled();
  });

  it('admits a stored id that an allowlist row resolved to', async () => {
    getOptionalCatalogAdmissionPolicyMock.mockReturnValue({
      musicEnabled: true,
      podcastIndexIdAllowlist: [1],
    });
    catalogAllowlistTableAdmitsMock.mockResolvedValue(true);

    await admit(20, 10);

    expect(catalogAllowlistTableAdmitsMock).toHaveBeenCalledWith([20, 10]);
  });

  it('admits the surviving show of a listed id that was merged', async () => {
    getOptionalCatalogAdmissionPolicyMock.mockReturnValue({
      musicEnabled: true,
      podcastIndexIdAllowlist: [1],
    });

    await admit(9, 1);

    expect(getOptionalIndexProviderMock).not.toHaveBeenCalled();
  });

  it('rejects music and musicL when music is off', async () => {
    getOptionalCatalogAdmissionPolicyMock.mockReturnValue({
      musicEnabled: false,
      podcastIndexIdAllowlist: null,
    });
    const getFeedById = vi
      .fn()
      .mockResolvedValueOnce(foundMedium('music'))
      .mockResolvedValueOnce(foundMedium('musicL'));
    getOptionalIndexProviderMock.mockReturnValue({ getFeedById });

    await expectRefused(8, 'music');
    await expectRefused(8, 'music');

    expect(getFeedById).toHaveBeenCalledTimes(2);
  });

  it('admits a podcast and a feed with no medium when music is off', async () => {
    getOptionalCatalogAdmissionPolicyMock.mockReturnValue({
      musicEnabled: false,
      podcastIndexIdAllowlist: null,
    });
    const getFeedById = vi
      .fn()
      .mockResolvedValueOnce(foundMedium('podcast'))
      .mockResolvedValueOnce(foundMedium(null));
    getOptionalIndexProviderMock.mockReturnValue({ getFeedById });

    await admit(8);
    await admit(8);

    expect(getAndParseRSSFeedMock).not.toHaveBeenCalled();
  });

  it('refuses a music publisher, admits a podcast publisher, and refuses when the publisher fetch throws', async () => {
    getOptionalCatalogAdmissionPolicyMock.mockReturnValue({
      musicEnabled: false,
      podcastIndexIdAllowlist: null,
    });
    const getFeedById = vi.fn().mockResolvedValue(foundMedium('publisher'));
    getOptionalIndexProviderMock.mockReturnValue({ getFeedById });
    getAndParseRSSFeedMock
      .mockResolvedValueOnce({
        medium: 'publisher',
        podcastRemoteItems: [{ medium: 'music' }, { medium: 'music' }, { medium: 'podcast' }],
      })
      .mockResolvedValueOnce({
        medium: 'publisher',
        podcastRemoteItems: [{ medium: 'podcast' }, { medium: 'podcast' }, { medium: 'music' }],
      })
      .mockRejectedValueOnce(new Error('fetch failed'));

    await expectRefused(9, 'music');
    await admit(9);
    await expectRefused(9, 'medium_unknown');

    expect(loggerWarnMock).toHaveBeenCalledWith(
      'assertCatalogAdmitsNewFeed: publisher fetch failed podcast_index_id=9 url=https://example.com/feed.xml reason=fetch failed'
    );
  });

  it('refuses when the medium cannot be read', async () => {
    getOptionalCatalogAdmissionPolicyMock.mockReturnValue({
      musicEnabled: false,
      podcastIndexIdAllowlist: null,
    });

    getOptionalIndexProviderMock.mockReturnValue({
      getFeedById: vi.fn().mockResolvedValue({ status: 'not_found' }),
    });
    await expectRefused(4, 'medium_unknown');

    getOptionalIndexProviderMock.mockReturnValue({
      getFeedById: vi.fn().mockResolvedValue({ status: 'unavailable' }),
    });
    await expectRefused(4, 'medium_unknown');

    getOptionalIndexProviderMock.mockReturnValue(null);
    await expectRefused(4, 'medium_unknown');
  });

  it('still rejects music when the id is on the allowlist and music is off', async () => {
    getOptionalCatalogAdmissionPolicyMock.mockReturnValue({
      musicEnabled: false,
      podcastIndexIdAllowlist: [5],
    });
    getOptionalIndexProviderMock.mockReturnValue({
      getFeedById: vi.fn().mockResolvedValue(foundMedium('music')),
    });

    await expectRefused(5, 'music');
  });
});
