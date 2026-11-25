import { randomUUID } from 'node:crypto';

import type { Server } from 'http';
import request from 'supertest';
import type { EntityManager } from 'typeorm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { MediumEnum } from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

describe('catalog allowlist id alias', () => {
  let app: import('express').Express | undefined;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let apiBase = '';

  function requireApp(): import('express').Express {
    if (!app) {
      throw new Error('test app required');
    }
    return app;
  }

  function requireManager(): EntityManager {
    if (!ormContext) {
      throw new Error('ORM context required');
    }
    return ormContext.dataSourceReadWrite.manager;
  }

  beforeAll(async () => {
    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    apiBase = getBaseApiUrl();
  });

  afterAll(async () => {
    await stopTestApp({ server, ormContext });
  });

  it('loads the feed stored under the resolved id for the listed id', async () => {
    const token = randomUUID().slice(0, 8);
    const listedId = 1_880_000_000 + (Number.parseInt(token.slice(0, 6), 16) % 20_000_000);
    const resolvedId = listedId + 1;
    const url = `https://allowlist-alias-${token}.example/feed.xml`;
    const manager = requireManager();
    const { CatalogPodcastIndexAllowlist, Channel, Feed } = await import('@podverse/orm');

    const feedRepo = manager.getRepository(Feed);
    const feed = await feedRepo.save(
      feedRepo.create({
        url,
        podcast_index_id: resolvedId,
      })
    );
    const channelRepo = manager.getRepository(Channel);
    const channel = await channelRepo.save(
      channelRepo.create({
        feed_id: feed.id,
        medium_id: MediumEnum.Podcast,
        title: 'Allowlist alias',
      })
    );
    await manager.query(`INSERT INTO channel_about (channel_id) VALUES ($1)`, [channel.id]);
    const allowlistRepo = manager.getRepository(CatalogPodcastIndexAllowlist);
    await allowlistRepo.save(
      allowlistRepo.create({
        podcast_index_id: listedId,
        resolved_podcast_index_id: resolvedId,
        origin: 'admin',
        title: 'Allowlist alias',
        feed_url: url,
      })
    );

    const http = requireApp();
    const byFeed = await request(http).get(`${apiBase}/feed/${listedId}`);
    expect(byFeed.status).toBe(200);
    expect(isRecord(byFeed.body) ? byFeed.body.podcast_index_id : null).toBe(resolvedId);

    const byChannel = await request(http).get(`${apiBase}/channel/podcast-index/${listedId}`);
    expect(byChannel.status).toBe(200);
    expect(isRecord(byChannel.body) ? byChannel.body.id_text : null).toBe(channel.id_text);

    const resolved = await request(http)
      .post(`${apiBase}/identity/resolve`)
      .send({ podcast_index_ids: [listedId] });
    expect(resolved.status).toBe(200);
    const moves =
      isRecord(resolved.body) && Array.isArray(resolved.body.podcast_index_ids)
        ? resolved.body.podcast_index_ids
        : [];
    expect(moves).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          from: listedId,
          to_channel_id_text: channel.id_text,
        }),
      ])
    );
  });
});
