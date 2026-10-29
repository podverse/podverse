import type { Server } from 'http';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { getQueueMediumIdFromType, SharableStatusEnum } from '@podverse/helpers';
import type { ORMContext, Playlist } from '@podverse/orm';

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

type SeededAccount = {
  id: number;
  idText: string;
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

describe('public playlist recent read (real database)', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let manager: EntityManager | undefined;
  const runId = Date.now();
  const idSuffix = String(runId % 100_000_000).padStart(8, '0');
  const newerIdText = `plrcna${idSuffix}`;
  const olderIdText = `plrcnb${idSuffix}`;
  const privateIdText = `plrcnc${idSuffix}`;
  const seededIdTexts = [newerIdText, olderIdText, privateIdText];
  const displayName = `Recent Public ${runId}`;
  const playlistIds: number[] = [];
  const accountIds: number[] = [];
  let seededAccount: SeededAccount | undefined;

  const query = async (sql: string, params: unknown[] = []): Promise<unknown> => {
    if (!manager) {
      throw new Error('ORM manager required');
    }
    return manager.query(sql, params);
  };

  const insertReturningId = async (sql: string, params: unknown[]): Promise<number> => {
    return asId(firstRow(await query(sql, params)).id);
  };

  const seedPublicAccount = async (): Promise<SeededAccount> => {
    if (!manager) {
      throw new Error('ORM manager required');
    }
    const { AccountService } = await import('@podverse/orm');
    const email = `playlist-public-recent-${runId}@example.com`;
    const accountService = new AccountService();
    await accountService.create({
      email,
      password: 'IntegrationTest1!',
      locale: 'en-US',
      terms_version: '2026-10-15',
    });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error('Failed to load the public playlist recent account');
    }
    accountIds.push(account.id);
    await query(`UPDATE account SET sharable_status_id = $2 WHERE id = $1`, [
      account.id,
      SharableStatusEnum.Public,
    ]);
    await query(`UPDATE account_profile SET display_name = $2 WHERE account_id = $1`, [
      account.id,
      displayName,
    ]);
    return { id: account.id, idText: account.id_text };
  };

  const insertPlaylist = async (
    idText: string,
    sharableStatusId: number,
    lastUpdatedSql: string
  ): Promise<void> => {
    if (seededAccount === undefined) {
      throw new Error('Seeded account required');
    }
    const avMediumId = getQueueMediumIdFromType('av');
    if (avMediumId === null) {
      throw new Error('AV queue medium id is required to seed public playlists');
    }
    const id = await insertReturningId(
      `INSERT INTO playlist
         (id_text, account_id, sharable_status_id, medium_id, title, last_updated)
       VALUES ($1, $2, $3, $4, $5, ${lastUpdatedSql})
       RETURNING id`,
      [idText, seededAccount.id, sharableStatusId, avMediumId, `Recent ${idText}`]
    );
    playlistIds.push(id);
  };

  const seededRows = (rows: Playlist[]): Playlist[] => {
    return rows.filter((row) => seededIdTexts.includes(row.id_text));
  };

  const listPublic = async (medium: 'av' | 'music'): Promise<Playlist[]> => {
    const { PlaylistService } = await import('@podverse/orm');
    return new PlaylistService().getManyPublicForList(medium, {
      order: { last_updated: 'DESC', id_text: 'ASC' },
      take: 60,
    });
  };

  beforeAll(async () => {
    const started = await startTestApp();
    server = started.server;
    ormContext = started.ormContext;
    if (!ormContext) {
      throw new Error('ORM context required for the public playlist recent integration test');
    }
    manager = ormContext.dataSourceReadWrite.manager;
    seededAccount = await seedPublicAccount();
    await insertPlaylist(newerIdText, SharableStatusEnum.Public, "now() + interval '10 years'");
    await insertPlaylist(
      olderIdText,
      SharableStatusEnum.Public,
      "now() + interval '10 years' - interval '1 day'"
    );
    await insertPlaylist(
      privateIdText,
      SharableStatusEnum.Private,
      "now() + interval '10 years' + interval '1 day'"
    );
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

  it('returns public playlists newest first and leaves out private playlists', async () => {
    const rows = seededRows(await listPublic('av'));
    expect(rows.map((row) => row.id_text)).toEqual([newerIdText, olderIdText]);
  });

  it('returns only the account handle and display name', async () => {
    if (seededAccount === undefined) {
      throw new Error('Seeded account required');
    }
    const row = seededRows(await listPublic('av')).find((item) => item.id_text === newerIdText);
    if (row === undefined) {
      throw new Error('seeded public playlist was not on the first page');
    }
    expect(row.account.id_text).toBe(seededAccount.idText);
    expect(row.account.account_profile.display_name).toBe(displayName);
    const accountKeys = Object.keys(row.account);
    expect(accountKeys).not.toContain('billing_customer_ref');
    expect(accountKeys).not.toContain('created_at');
    expect(accountKeys).not.toContain('notifications_last_read_at');
  });

  it('leaves out playlists of another medium', async () => {
    expect(seededRows(await listPublic('music'))).toEqual([]);
  });
});
