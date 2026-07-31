import { beforeEach, describe, expect, it, vi } from 'vitest';

const { accountGetMock, createMock, deleteMock, findMock, findOneMock, saveMock } = vi.hoisted(
  () => ({
    accountGetMock: vi.fn(),
    createMock: vi.fn(),
    deleteMock: vi.fn(),
    findMock: vi.fn(),
    findOneMock: vi.fn(),
    saveMock: vi.fn(),
  })
);

const { AccountPendingFollowingChannelEntity } = vi.hoisted(() => ({
  AccountPendingFollowingChannelEntity: class AccountPendingFollowingChannel {},
}));

vi.mock('@orm/db/index.js', () => ({
  AppDataSourceRead: {
    getRepository: () => ({
      find: findMock,
      findOne: findOneMock,
    }),
  },
  AppDataSourceReadWrite: {
    getRepository: () => ({
      create: createMock,
      delete: deleteMock,
      save: saveMock,
    }),
  },
}));

vi.mock('@orm/services/account/account.js', () => ({
  AccountService: class AccountService {
    get = accountGetMock;
  },
}));

vi.mock('@orm/entities/account/accountPendingFollowingChannel.js', () => ({
  AccountPendingFollowingChannel: AccountPendingFollowingChannelEntity,
}));

import { AccountPendingFollowingChannelService } from './accountPendingFollowingChannel.js';

describe('AccountPendingFollowingChannelService', () => {
  beforeEach(() => {
    accountGetMock.mockReset();
    createMock.mockReset();
    deleteMock.mockReset();
    findMock.mockReset();
    findOneMock.mockReset();
    saveMock.mockReset();
    accountGetMock.mockResolvedValue({ id: 9 });
  });

  it('creates a canonical pending follow row when none exists', async () => {
    findOneMock.mockResolvedValue(null);
    createMock.mockImplementation((dto) => dto);
    saveMock.mockImplementation(async (row) => ({ id: 101, ...row }));

    const service = new AccountPendingFollowingChannelService();
    const result = await service.addPendingFollow(9, {
      podcast_index_id: 42,
      feed_url: 'http://example.com/feed path.xml',
    });

    expect(findOneMock).toHaveBeenCalledWith({
      where: {
        account_id: 9,
        feed_url: 'http://example.com/feed%20path.xml',
      },
    });
    expect(createMock).toHaveBeenCalledWith({
      account_id: 9,
      podcast_index_id: 42,
      feed_url: 'http://example.com/feed%20path.xml',
    });
    expect(result).toMatchObject({
      id: 101,
      account_id: 9,
      podcast_index_id: 42,
      feed_url: 'http://example.com/feed%20path.xml',
    });
  });

  it('updates existing row when podcast_index_id is newly available', async () => {
    findOneMock.mockResolvedValue({
      id: 202,
      account_id: 9,
      podcast_index_id: null,
      feed_url: 'https://example.com/feed.xml',
    });
    saveMock.mockImplementation(async (row) => row);

    const service = new AccountPendingFollowingChannelService();
    const result = await service.addPendingFollow(9, {
      podcast_index_id: 88,
      feed_url: 'https://example.com/feed.xml',
    });

    expect(saveMock).toHaveBeenCalledWith({
      id: 202,
      account_id: 9,
      podcast_index_id: 88,
      feed_url: 'https://example.com/feed.xml',
    });
    expect(result).toMatchObject({
      id: 202,
      podcast_index_id: 88,
    });
  });

  it('finds and de-duplicates pending follows by podcast_index_id/feed_url', async () => {
    findMock
      .mockResolvedValueOnce([
        { id: 1, account_id: 9, podcast_index_id: 5, feed_url: 'https://example.com/feed.xml' },
        { id: 1, account_id: 9, podcast_index_id: 5, feed_url: 'https://example.com/feed.xml' },
      ])
      .mockResolvedValueOnce([
        { id: 1, account_id: 9, podcast_index_id: 5, feed_url: 'https://example.com/feed.xml' },
      ]);

    const service = new AccountPendingFollowingChannelService();
    const result = await service.getPendingFollowsForChannel({
      podcast_index_id: 5,
      feed_url: 'http://example.com/feed.xml',
    });

    expect(findMock).toHaveBeenNthCalledWith(1, {
      where: [{ podcast_index_id: 5 }, { feed_url: 'http://example.com/feed.xml' }],
    });
    expect(findMock).toHaveBeenNthCalledWith(2, {
      where: {
        id: expect.any(Object),
      },
    });
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe(1);
  });

  it('removes pending follows by id or by account/feed keys', async () => {
    const service = new AccountPendingFollowingChannelService();

    await service.removePendingFollow(77);
    await service.removePendingFollow({
      account_id: 9,
      feed_url: 'http://example.com/feed path.xml',
    });

    expect(deleteMock).toHaveBeenNthCalledWith(1, { id: 77 });
    expect(deleteMock).toHaveBeenNthCalledWith(2, {
      account_id: 9,
      feed_url: 'http://example.com/feed%20path.xml',
    });
  });
});
