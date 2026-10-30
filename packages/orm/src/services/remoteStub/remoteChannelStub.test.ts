import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  managerQuery: vi.fn(async (_sql: string, _parameters?: readonly unknown[]): Promise<unknown> => [
    { id: 7 },
  ]),
  managerFindOne: vi.fn(async (): Promise<unknown> => null),
  find: vi.fn(async (): Promise<unknown[]> => []),
  createQueryBuilder: vi.fn(),
}));

vi.mock('@orm/context.js', () => {
  const repository = {
    find: mocks.find,
    createQueryBuilder: mocks.createQueryBuilder,
  };
  const manager = { query: mocks.managerQuery, findOne: mocks.managerFindOne };
  return {
    getDataSourceRead: () => ({ getRepository: () => repository }),
    getDataSourceReadWrite: () => ({
      getRepository: () => repository,
      transaction: (work: (transactionManager: typeof manager) => unknown) => work(manager),
    }),
  };
});

import { RemoteChannelStub } from '@orm/entities/remoteStub/remoteChannelStub.js';
import { RemoteChannelStubAlias } from '@orm/entities/remoteStub/remoteChannelStubAlias.js';

import type { IndexProviderFeed } from '@podverse/helpers';

import {
  normalizeRemoteStubFeedGuid,
  normalizeRemoteStubFeedUrl,
  RemoteChannelStubService,
} from './remoteChannelStub.js';

const GUID_A = '917393e3-1b1e-5cef-ace4-edaa54e1f810';
const GUID_B = '0b214041-5dac-44bb-974a-e61ccf840476';

function channelStub(id: number): RemoteChannelStub {
  return Object.assign(new RemoteChannelStub(), {
    id,
    index_provider: 'podcast_index',
    provider_feed_id: String(id * 100),
    feed_guid: null,
    feed_url: `https://example.com/${id}.xml`,
  });
}

function alias(
  kind: 'feed_guid' | 'feed_url',
  value: string,
  stub: RemoteChannelStub
): RemoteChannelStubAlias {
  return Object.assign(new RemoteChannelStubAlias(), {
    key_kind: kind,
    key_value: value,
    remote_channel_stub_id: stub.id,
    remote_channel_stub: stub,
  });
}

/** Answers each raw query the way Postgres would for the given rows. */
function respondBySql(
  rows: { upsertedId?: number; previousOwnerIds?: number[]; lockedId?: number | null } = {}
) {
  return async (sql: string): Promise<unknown> => {
    if (sql.includes('RETURNING id')) {
      return [{ id: rows.upsertedId ?? 7 }];
    }
    if (sql.includes('SELECT DISTINCT alias.remote_channel_stub_id')) {
      return (rows.previousOwnerIds ?? []).map((id) => ({ id }));
    }
    if (sql.includes('FOR UPDATE')) {
      return rows.lockedId === null || rows.lockedId === undefined ? [] : [{ id: rows.lockedId }];
    }
    return [];
  };
}

function providerFeed(overrides: Partial<IndexProviderFeed> = {}): IndexProviderFeed {
  return {
    indexProvider: 'podcast_index',
    providerFeedId: '920666',
    feedGuid: GUID_A,
    feedUrl: 'https://example.com/feed.xml',
    title: 'Show',
    author: 'Host',
    description: null,
    imageUrl: 'https://example.com/art.png',
    medium: 'music',
    isDead: false,
    ...overrides,
  };
}

describe('remote stub key normalization', () => {
  it('trims and lowercases a reliable GUID, and drops anything else', () => {
    expect(normalizeRemoteStubFeedGuid(`  ${GUID_A.toUpperCase()} `)).toBe(GUID_A);
    expect(normalizeRemoteStubFeedGuid('not-a-guid')).toBeNull();
    expect(normalizeRemoteStubFeedGuid('')).toBeNull();
    expect(normalizeRemoteStubFeedGuid(null)).toBeNull();
    expect(normalizeRemoteStubFeedGuid(undefined)).toBeNull();
  });

  it('trims a feed URL, keeps its case, and drops empty or overlong values', () => {
    expect(normalizeRemoteStubFeedUrl('  https://Example.com/Feed.xml ')).toBe(
      'https://Example.com/Feed.xml'
    );
    expect(normalizeRemoteStubFeedUrl('   ')).toBeNull();
    expect(normalizeRemoteStubFeedUrl(`https://example.com/${'a'.repeat(2083)}`)).toBeNull();
    expect(normalizeRemoteStubFeedUrl(null)).toBeNull();
  });
});

describe('RemoteChannelStubService.getChannelStubsForRefs', () => {
  beforeEach(() => {
    mocks.find.mockReset();
  });

  it('prefers a GUID match over a URL match, returns null for unmatched refs, and keeps input order', async () => {
    const byGuid = channelStub(1);
    const byUrl = channelStub(2);
    mocks.find.mockResolvedValue([
      alias('feed_url', 'https://example.com/shared.xml', byUrl),
      alias('feed_guid', GUID_A, byGuid),
    ]);

    const result = await new RemoteChannelStubService().getChannelStubsForRefs([
      { feedGuid: null, feedUrl: 'https://example.com/missing.xml' },
      { feedGuid: GUID_A.toUpperCase(), feedUrl: 'https://example.com/shared.xml' },
      { feedGuid: GUID_B, feedUrl: ' https://example.com/shared.xml ' },
      { feedGuid: null, feedUrl: null },
    ]);

    expect(result).toEqual([null, byGuid, byUrl, null]);
    expect(mocks.find).toHaveBeenCalledTimes(1);
  });

  it('issues no query when no ref has a usable key', async () => {
    const result = await new RemoteChannelStubService().getChannelStubsForRefs([
      { feedGuid: 'bad', feedUrl: '' },
    ]);

    expect(result).toEqual([null]);
    expect(mocks.find).not.toHaveBeenCalled();
  });
});

describe('RemoteChannelStubService.upsertChannelStub', () => {
  beforeEach(() => {
    mocks.managerQuery.mockReset();
    mocks.managerQuery.mockImplementation(respondBySql());
    mocks.managerFindOne.mockReset();
    mocks.managerFindOne.mockResolvedValue(channelStub(7));
  });

  it('upserts on the provider key, then writes one deduped alias upsert of ref and provider keys', async () => {
    const stub = await new RemoteChannelStubService().upsertChannelStub(
      providerFeed({ title: 't'.repeat(300), imageUrl: `https://e.com/${'a'.repeat(2100)}` }),
      [
        { feedGuid: GUID_A.toUpperCase(), feedUrl: 'https://example.com/feed.xml' },
        { feedGuid: GUID_B, feedUrl: ' https://old.example.com/feed.xml ' },
        { feedGuid: null, feedUrl: null },
      ]
    );

    expect(stub.id).toBe(7);
    expect(mocks.managerQuery).toHaveBeenCalledTimes(3);

    const [stubSql, stubParams] = mocks.managerQuery.mock.calls[0] ?? [];
    expect(stubSql).toContain('ON CONFLICT (index_provider, provider_feed_id) DO UPDATE');
    expect(stubSql).toContain('resolved_at = now()');
    expect(stubSql).toContain('RETURNING id');
    expect(stubParams).toEqual([
      'podcast_index',
      '920666',
      GUID_A,
      'https://example.com/feed.xml',
      't'.repeat(255),
      'Host',
      null,
      3,
    ]);

    const expectedAliasParams = [
      7,
      ['feed_guid', 'feed_guid', 'feed_url', 'feed_url'],
      [GUID_B, GUID_A, 'https://example.com/feed.xml', 'https://old.example.com/feed.xml'],
    ];

    const [ownersSql, ownersParams] = mocks.managerQuery.mock.calls[1] ?? [];
    expect(ownersSql).toContain('WHERE alias.remote_channel_stub_id <> $1');
    expect(ownersParams).toEqual(expectedAliasParams);

    const [aliasSql, aliasParams] = mocks.managerQuery.mock.calls[2] ?? [];
    expect(aliasSql).toContain('ON CONFLICT (key_kind, key_value) DO UPDATE');
    expect(aliasSql).toContain('remote_channel_stub_id = EXCLUDED.remote_channel_stub_id');
    expect(aliasParams).toEqual(expectedAliasParams);
  });

  it('deletes previous key owners left with no alias, and keeps owners that still have one', async () => {
    mocks.managerQuery.mockImplementation(respondBySql({ previousOwnerIds: [4, 5] }));

    await new RemoteChannelStubService().upsertChannelStub(providerFeed(), []);

    expect(mocks.managerQuery).toHaveBeenCalledTimes(4);
    const [deleteSql, deleteParams] = mocks.managerQuery.mock.calls[3] ?? [];
    expect(deleteSql).toContain('DELETE FROM remote_channel_stub stub');
    expect(deleteSql).toContain('stub.id = ANY($1::int[])');
    expect(deleteSql).toContain('NOT EXISTS');
    expect(deleteSql).toContain('WHERE alias.remote_channel_stub_id = stub.id');
    expect(deleteParams).toEqual([[4, 5]]);
  });

  it('issues no orphan delete when no other stub owned the keys', async () => {
    await new RemoteChannelStubService().upsertChannelStub(providerFeed(), []);

    const sqls = mocks.managerQuery.mock.calls.map(([sql]) => sql);
    expect(sqls.some((sql) => sql.includes('DELETE'))).toBe(false);
  });
});

describe('RemoteChannelStubService.repointToFeed', () => {
  beforeEach(() => {
    mocks.managerQuery.mockReset();
    mocks.managerFindOne.mockReset();
    mocks.managerFindOne.mockResolvedValue(channelStub(7));
  });

  it('returns null and writes nothing when the source stub is missing', async () => {
    mocks.managerQuery.mockImplementation(respondBySql({ lockedId: null }));

    const result = await new RemoteChannelStubService().repointToFeed(3, providerFeed());

    expect(result).toBeNull();
    expect(mocks.managerQuery).toHaveBeenCalledTimes(1);
    expect(mocks.managerQuery.mock.calls[0]?.[0]).toContain('FOR UPDATE');
    expect(mocks.managerFindOne).not.toHaveBeenCalled();
  });

  it('only refreshes the row when the provider returns the same feed', async () => {
    mocks.managerQuery.mockImplementation(respondBySql({ lockedId: 3, upsertedId: 3 }));
    mocks.managerFindOne.mockResolvedValue(channelStub(3));

    const result = await new RemoteChannelStubService().repointToFeed(3, providerFeed());

    expect(result?.id).toBe(3);
    expect(mocks.managerQuery).toHaveBeenCalledTimes(2);
    expect(mocks.managerQuery.mock.calls[1]?.[0]).toContain(
      'ON CONFLICT (index_provider, provider_feed_id) DO UPDATE'
    );
  });

  it('moves aliases and stale item stubs to the target, deletes the source, and returns the target', async () => {
    mocks.managerQuery.mockImplementation(respondBySql({ lockedId: 3, upsertedId: 7 }));

    const result = await new RemoteChannelStubService().repointToFeed(3, providerFeed());

    expect(result?.id).toBe(7);
    const calls = mocks.managerQuery.mock.calls;
    expect(calls).toHaveLength(7);

    const [moveSql, moveParams] = calls[2] ?? [];
    expect(moveSql).toContain('UPDATE remote_channel_stub_alias');
    expect(moveParams).toEqual([7, 3]);

    const [aliasSql, aliasParams] = calls[4] ?? [];
    expect(aliasSql).toContain('ON CONFLICT (key_kind, key_value) DO UPDATE');
    expect(aliasParams).toEqual([
      7,
      ['feed_guid', 'feed_url'],
      [GUID_A, 'https://example.com/feed.xml'],
    ]);

    const [copySql, copyParams] = calls[5] ?? [];
    expect(copySql).toContain('INSERT INTO remote_item_stub');
    expect(copySql).toContain(
      "SELECT $1, item_guid, NULL, title, image_url, pub_date, duration_seconds, 'epoch'::timestamptz"
    );
    expect(copySql).toContain('ON CONFLICT (remote_channel_stub_id, item_guid) DO NOTHING');
    expect(copyParams).toEqual([7, 3]);

    const [deleteSql, deleteParams] = calls[6] ?? [];
    expect(deleteSql).toBe('DELETE FROM remote_channel_stub WHERE id = $1');
    expect(deleteParams).toEqual([3]);
  });
});

describe('RemoteChannelStubService.listProviderFeedIds', () => {
  beforeEach(() => {
    mocks.find.mockReset();
  });

  it('reads provider feed ids for one provider', async () => {
    mocks.find.mockResolvedValue([{ provider_feed_id: '920666' }, { provider_feed_id: '42' }]);

    const ids = await new RemoteChannelStubService().listProviderFeedIds('podcast_index');

    expect(ids).toEqual(['920666', '42']);
    expect(mocks.find).toHaveBeenCalledWith({
      select: { provider_feed_id: true },
      where: { index_provider: 'podcast_index' },
    });
  });
});

describe('RemoteChannelStubService.deleteForParsedFeed', () => {
  beforeEach(() => {
    mocks.createQueryBuilder.mockReset();
  });

  it('deletes nothing and issues no query when every key is null', async () => {
    const deleted = await new RemoteChannelStubService().deleteForParsedFeed({
      podcastIndexId: null,
      podcastGuid: null,
      feedUrl: null,
    });

    expect(deleted).toBe(0);
    expect(mocks.createQueryBuilder).not.toHaveBeenCalled();
  });

  it('matches by Podcast Index id, normalized GUID, or trimmed feed URL', async () => {
    const where = vi.fn(() => ({ execute: async () => ({ affected: 2 }) }));
    mocks.createQueryBuilder.mockReturnValue({ delete: () => ({ where }) });

    const deleted = await new RemoteChannelStubService().deleteForParsedFeed({
      podcastIndexId: 920666,
      podcastGuid: GUID_A.toUpperCase(),
      feedUrl: ' https://example.com/feed.xml ',
    });

    expect(deleted).toBe(2);
    expect(where).toHaveBeenCalledWith(
      '(index_provider = :podcastIndexProvider AND provider_feed_id = :providerFeedId) OR ' +
        'feed_guid = :feedGuid OR feed_url = :feedUrl',
      {
        podcastIndexProvider: 'podcast_index',
        providerFeedId: '920666',
        feedGuid: GUID_A,
        feedUrl: 'https://example.com/feed.xml',
      }
    );
  });
});
