import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  getQueueMediumIdFromType,
  PLAYLIST_TAG_NAME_MAX_LENGTH,
  SharableStatusEnum,
} from '@podverse/helpers';
import type { ORMContext, PlaylistTagService } from '@podverse/orm';

import { startTestApp, stopTestApp } from './helpers/index.js';

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
  };
});

type EntityManager = ORMContext['dataSourceReadWrite']['manager'];

type SeededPlaylists = {
  publicA: number;
  publicB: number;
  privateOnly: number;
  unlisted: number;
  overflow: number;
  wide: number;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function firstRow(value: unknown): Record<string, unknown> {
  const row = Array.isArray(value) ? value.filter(isRecord)[0] : undefined;
  if (row === undefined) {
    throw new Error('expected a row');
  }
  return row;
}

function asId(value: unknown): number {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return Number(value);
  }
  throw new Error('expected an id');
}

function asName(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0) {
    throw new Error('expected a name');
  }
  return value;
}

describe('playlist tag storage (real database)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let manager: EntityManager | undefined;
  let tags: PlaylistTagService | undefined;
  let seeded: SeededPlaylists | undefined;
  const runId = Date.now();
  const idSuffix = String(runId % 100_000_000).padStart(8, '0');
  const publicAIdText = `pltga${idSuffix}`;
  const publicBIdText = `pltgb${idSuffix}`;
  const privateIdText = `pltgp${idSuffix}`;
  const unlistedIdText = `pltgu${idSuffix}`;
  const overflowIdText = `pltgo${idSuffix}`;
  const wideIdText = `pltgw${idSuffix}`;
  const playlistIds: number[] = [];
  const accountIds: number[] = [];

  const query = async (sql: string, params: unknown[] = []): Promise<unknown> => {
    if (!manager) {
      throw new Error('ORM manager required');
    }
    return manager.query(sql, params);
  };

  const insertReturningId = async (sql: string, params: unknown[]): Promise<number> => {
    return asId(firstRow(await query(sql, params)).id);
  };

  const catalogCount = async (name: string): Promise<number> => {
    return asId(
      firstRow(await query(`SELECT COUNT(*)::int AS id FROM playlist_tag WHERE name = $1`, [name]))
        .id
    );
  };

  const assignmentCount = async (playlistId: number): Promise<number> => {
    return asId(
      firstRow(
        await query(
          `SELECT COUNT(*)::int AS id FROM playlist_tag_assignment WHERE playlist_id = $1`,
          [playlistId]
        )
      ).id
    );
  };

  const tagIdFor = async (playlistId: number, name: string): Promise<number> => {
    return asId(
      firstRow(
        await query(
          `SELECT playlist_tag.id
           FROM playlist_tag
           INNER JOIN playlist_tag_assignment
             ON playlist_tag_assignment.playlist_tag_id = playlist_tag.id
           WHERE playlist_tag_assignment.playlist_id = $1
             AND playlist_tag.name = $2`,
          [playlistId, name]
        )
      ).id
    );
  };

  const positionsFor = async (
    playlistId: number
  ): Promise<{ position: number; name: string }[]> => {
    const rows = await query(
      `SELECT playlist_tag_assignment.list_position, playlist_tag.name
       FROM playlist_tag_assignment
       INNER JOIN playlist_tag
         ON playlist_tag.id = playlist_tag_assignment.playlist_tag_id
       WHERE playlist_tag_assignment.playlist_id = $1
       ORDER BY playlist_tag_assignment.list_position`,
      [playlistId]
    );
    if (!Array.isArray(rows)) {
      throw new Error('expected assignment rows');
    }
    return rows.filter(isRecord).map((row) => ({
      position: asId(row.list_position),
      name: asName(row.name),
    }));
  };

  const requireTags = (): PlaylistTagService => {
    if (!tags) {
      throw new Error('PlaylistTagService required');
    }
    return tags;
  };

  const requireSeeded = (): SeededPlaylists => {
    if (!seeded) {
      throw new Error('Seeded playlists required');
    }
    return seeded;
  };

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for the playlist tag integration test');
    }
    manager = ormContext.dataSourceReadWrite.manager;

    const { AccountService, PlaylistTagService } = await import('@podverse/orm');
    const email = `playlist-tag-${runId}@example.com`;
    const accountService = new AccountService();
    await accountService.create({
      email,
      password: 'IntegrationTest1!',
      locale: 'en-US',
      terms_version: '2026-10-15',
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error('Failed to load the playlist tag account');
    }
    accountIds.push(account.id);
    await query(`UPDATE account SET sharable_status_id = $2 WHERE id = $1`, [
      account.id,
      SharableStatusEnum.Public,
    ]);
    await query(`UPDATE account_profile SET display_name = $2 WHERE account_id = $1`, [
      account.id,
      `Playlist Tag ${runId}`,
    ]);

    const avMediumId = getQueueMediumIdFromType('av');
    if (avMediumId === null) {
      throw new Error('AV queue medium id is required to seed playlists');
    }

    const insertPlaylist = async (idText: string, sharableStatusId: number): Promise<number> => {
      const id = await insertReturningId(
        `INSERT INTO playlist
           (id_text, account_id, sharable_status_id, medium_id, title, last_updated)
         VALUES ($1, $2, $3, $4, $5, now())
         RETURNING id`,
        [idText, account.id, sharableStatusId, avMediumId, `Tag ${idText}`]
      );
      playlistIds.push(id);
      return id;
    };

    seeded = {
      publicA: await insertPlaylist(publicAIdText, SharableStatusEnum.Public),
      publicB: await insertPlaylist(publicBIdText, SharableStatusEnum.Public),
      privateOnly: await insertPlaylist(privateIdText, SharableStatusEnum.Private),
      unlisted: await insertPlaylist(unlistedIdText, SharableStatusEnum.Unlisted),
      overflow: await insertPlaylist(overflowIdText, SharableStatusEnum.Public),
      wide: await insertPlaylist(wideIdText, SharableStatusEnum.Public),
    };

    tags = new PlaylistTagService();
    await tags.replaceForPlaylist(seeded.privateOnly, ['adam private']);
    await tags.replaceForPlaylist(seeded.unlisted, ['adam unlisted']);
  }, 120000);

  afterAll(async () => {
    try {
      if (manager && playlistIds.length > 0) {
        await manager.query(`DELETE FROM playlist WHERE id = ANY($1::int[])`, [playlistIds]);
      }
      if (accountIds.length > 0) {
        const { AccountService } = await import('@podverse/orm');
        const accountService = new AccountService();
        for (const accountId of accountIds) {
          await accountService.delete(accountId);
        }
      }
    } finally {
      await stopTestApp(server, ormContext);
    }
  });

  it('stores folded names in the owner order and drops a repeated name', async () => {
    const playlists = requireSeeded();
    await requireTags().replaceForPlaylist(playlists.publicA, [
      '  Adam Curry ',
      'adam curry',
      'Podcasting-2.0',
    ]);

    const loaded = await requireTags().loadTagNamesByPlaylistIdText([
      publicAIdText,
      `miss${idSuffix}`,
    ]);
    expect(loaded.get(publicAIdText)).toEqual(['adam curry', 'podcasting-2.0']);
    expect(loaded.has(`miss${idSuffix}`)).toBe(false);
    expect(await catalogCount('adam curry')).toBe(1);
    expect(await catalogCount('podcasting-2.0')).toBe(1);
  });

  it('reuses the catalog row when another playlist saves the same folded name', async () => {
    const playlists = requireSeeded();
    await requireTags().replaceForPlaylist(playlists.publicB, ['ADAM CURRY']);

    const firstId = await tagIdFor(playlists.publicA, 'adam curry');
    const secondId = await tagIdFor(playlists.publicB, 'adam curry');
    expect(secondId).toBe(firstId);
    expect(await catalogCount('adam curry')).toBe(1);
  });

  it('searches folded names on public and unlisted playlists only', async () => {
    const found = await requireTags().searchVisiblePrefix('adam');
    expect(found).toEqual(['adam curry', 'adam unlisted']);
    expect(await requireTags().searchVisiblePrefix('ADAM')).toEqual([
      'adam curry',
      'adam unlisted',
    ]);
  });

  it('removes a name that no playlist still uses and keeps a shared name', async () => {
    const playlists = requireSeeded();
    await requireTags().replaceForPlaylist(playlists.publicA, []);

    const loaded = await requireTags().loadTagNamesByPlaylistIdText([publicAIdText]);
    expect(loaded.has(publicAIdText)).toBe(false);
    expect(await catalogCount('podcasting-2.0')).toBe(0);
    expect(await catalogCount('adam curry')).toBe(1);
    expect(await tagIdFor(playlists.publicB, 'adam curry')).toBeGreaterThan(0);
  });

  it('removes the catalog row when the last playlist that uses it is deleted', async () => {
    const playlists = requireSeeded();
    await query(`DELETE FROM playlist WHERE id = $1`, [playlists.publicB]);

    expect(await catalogCount('adam curry')).toBe(0);
    expect(await catalogCount('adam private')).toBe(1);
    expect(await catalogCount('adam unlisted')).toBe(1);
  });

  it('rejects a sixth tag and writes nothing when no limit is passed', async () => {
    const playlists = requireSeeded();
    const names = ['a', 'b', 'c', 'd', 'e', 'f'].map((letter) => `over${letter}${idSuffix}`);

    await expect(requireTags().replaceForPlaylist(playlists.overflow, names)).rejects.toThrow(
      'Playlist tag list rejected: too_many'
    );
    expect(await assignmentCount(playlists.overflow)).toBe(0);
    for (const name of names) {
      expect(await catalogCount(name)).toBe(0);
    }
  });

  it('stores six assignments when the count limit is 8', async () => {
    const playlists = requireSeeded();
    const names = ['a', 'b', 'c', 'd', 'e', 'f'].map((letter) => `wide${letter}${idSuffix}`);

    await requireTags().replaceForPlaylist(playlists.wide, names, {
      maxCount: 8,
      maxLength: PLAYLIST_TAG_NAME_MAX_LENGTH,
    });

    expect(await positionsFor(playlists.wide)).toEqual(
      names.map((name, index) => ({ position: index + 1, name }))
    );
  });
});
