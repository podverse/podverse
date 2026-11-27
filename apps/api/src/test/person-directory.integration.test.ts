import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

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

const token = `plist${randomUUID().replaceAll('-', '').slice(0, 8)}`;
const listedIdText = `p${randomUUID().replaceAll('-', '').slice(0, 9)}`;
const hiddenIdText = `h${randomUUID().replaceAll('-', '').slice(0, 9)}`;
const listedName = `Person List ${token}`;
const hiddenName = `Person Hidden ${token}`;

function idTexts(body: unknown): string[] {
  if (typeof body !== 'object' || body === null || !('data' in body) || !Array.isArray(body.data)) {
    return [];
  }
  return body.data.flatMap((row) => {
    if (typeof row !== 'object' || row === null || !('id_text' in row)) {
      return [];
    }
    return typeof row.id_text === 'string' ? [row.id_text] : [];
  });
}

describe('Person directory', () => {
  let app: import('express').Express | undefined;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let listUrl = '';

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    listUrl = `${await getBaseApiUrl()}/person`;
    const db = ormContext?.dataSourceReadWrite;
    if (db === undefined) {
      throw new Error('Person directory test has no database');
    }
    await db.query(
      `INSERT INTO person (id_text, name_key, display_name, item_appearance_count)
       VALUES ($1, public.person_name_key($2), $2, 1),
              ($3, public.person_name_key($4), $4, 0)`,
      [listedIdText, listedName, hiddenIdText, hiddenName]
    );
  }, 120000);

  afterAll(async () => {
    if (ormContext) {
      await ormContext.dataSourceReadWrite.query(
        `DELETE FROM person WHERE id_text = ANY($1::text[])`,
        [[listedIdText, hiddenIdText]]
      );
    }
    await stopTestApp(server, ormContext);
  });

  it('lists a person with a public credit and leaves out a person with no credits', async () => {
    if (app === undefined) {
      throw new Error('Person directory test app did not start');
    }
    const listed = await request(app)
      .get(listUrl)
      .query({ q: listedName, sort: 'recent', page: 1 });
    expect(listed.status).toBe(200);
    expect(idTexts(listed.body)).toContain(listedIdText);

    const hidden = await request(app)
      .get(listUrl)
      .query({ q: hiddenName, sort: 'recent', page: 1 });
    expect(hidden.status).toBe(200);
    expect(idTexts(hidden.body)).not.toContain(hiddenIdText);
  });

  it('returns one person by public id', async () => {
    if (app === undefined) {
      throw new Error('Person directory test app did not start');
    }
    const response = await request(app).get(`${listUrl}/${listedIdText}`);
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ display_name: listedName, id_text: listedIdText });
  });
});
