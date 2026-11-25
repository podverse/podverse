import { config } from '@management-api/config/index.js';
import { loggerService } from '@management-api/factories/loggerService.js';
import { ensureAuthenticated } from '@management-api/lib/auth/index.js';
import { requireCrud } from '@management-api/lib/authz/requireCrud.js';
import type { Router } from 'express';
import Joi from 'joi';

import {
  parsePodcastIndexClientOptionsFromEnv,
  PodcastIndexService,
} from '@podverse/external-services-podcast-index';
import { CatalogPodcastIndexAllowlistService } from '@podverse/orm';

const searchQuerySchema = Joi.object({
  q: Joi.string().trim().min(1).max(200).required(),
});

const addBodySchema = Joi.object({
  podcast_index_id: Joi.number().integer().min(1).max(2147483647).required(),
  title: Joi.string().trim().max(500).allow(null, ''),
  feed_url: Joi.string().trim().max(2048).allow(null, ''),
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function envAllowlist(): readonly number[] | null {
  return config.catalog.podcastIndexIdAllowlist;
}

function disabled(res: { status: (code: number) => { json: (body: unknown) => void } }): void {
  res.status(404).json({
    code: 'catalog_allowlist_disabled',
    message: 'Catalog allowlist is not enabled',
  });
}

function optionalText(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

function podcastIndexService(): PodcastIndexService | null {
  const { authKey, baseUrl, secretKey } = config.podcastIndex;
  if (
    authKey === undefined ||
    authKey === '' ||
    baseUrl === undefined ||
    baseUrl === '' ||
    secretKey === undefined ||
    secretKey === ''
  ) {
    return null;
  }
  return new PodcastIndexService({
    userAgent: config.userAgent,
    authKey,
    baseUrl,
    secretKey,
    loggerService,
    ...parsePodcastIndexClientOptionsFromEnv(process.env),
  });
}

export function registerFeedCatalogAllowlistRoutes(router: Router): void {
  router.get(
    '/catalog-allowlist',
    ensureAuthenticated,
    requireCrud('feeds', 'read'),
    async (_req, res) => {
      const envIds = envAllowlist();
      if (envIds === null) {
        disabled(res);
        return;
      }
      const feeds = await new CatalogPodcastIndexAllowlistService().listForManagement(envIds);
      res.json({ feeds });
    }
  );

  router.get(
    '/catalog-allowlist/directory-search',
    ensureAuthenticated,
    requireCrud('feeds', 'read'),
    async (req, res) => {
      const envIds = envAllowlist();
      if (envIds === null) {
        disabled(res);
        return;
      }
      const { error, value } = searchQuerySchema.validate(req.query);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }
      const query = isRecord(value) && typeof value.q === 'string' ? value.q : '';
      const directory = podcastIndexService();
      if (directory === null) {
        res.status(503).json({
          code: 'directory_unavailable',
          message: 'Podcast Index is not configured',
        });
        return;
      }
      const result = await directory.searchPodcasts(query);
      if (result === null) {
        res.status(503).json({
          code: 'directory_unavailable',
          message: 'Podcast Index search failed',
        });
        return;
      }
      const service = new CatalogPodcastIndexAllowlistService();
      const rows = await service.listForManagement(envIds);
      const allowed = new Set<number>(envIds);
      for (const row of rows) {
        allowed.add(row.podcast_index_id);
        if (row.resolved_podcast_index_id !== null) {
          allowed.add(row.resolved_podcast_index_id);
        }
      }
      res.json({
        feeds: result.feeds.map((feed) => ({
          podcast_index_id: feed.id,
          title: feed.title,
          feed_url: feed.url,
          author: feed.author,
          already_allowed: allowed.has(feed.id),
        })),
      });
    }
  );

  router.post(
    '/catalog-allowlist',
    ensureAuthenticated,
    requireCrud('feeds', 'update'),
    async (req, res) => {
      const envIds = envAllowlist();
      if (envIds === null) {
        disabled(res);
        return;
      }
      const adminId = req.user?.id;
      if (adminId === undefined) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      const { error, value } = addBodySchema.validate(req.body);
      if (error || !isRecord(value) || typeof value.podcast_index_id !== 'number') {
        res.status(400).json({ message: error?.message ?? 'Invalid body' });
        return;
      }
      const result = await new CatalogPodcastIndexAllowlistService().insertAdmin({
        podcastIndexId: value.podcast_index_id,
        title: optionalText(value.title),
        feedUrl: optionalText(value.feed_url),
        adminId,
        envIds,
      });
      if (result === 'already') {
        res.status(409).json({
          code: 'already_allowed',
          message: 'That Podcast Index id is already allowed',
        });
        return;
      }
      res.status(201).json({
        podcast_index_id: value.podcast_index_id,
        origin: 'admin',
        title: optionalText(value.title),
        feed_url: optionalText(value.feed_url),
      });
    }
  );

  router.delete(
    '/catalog-allowlist/:podcastIndexId',
    ensureAuthenticated,
    requireCrud('feeds', 'update'),
    async (req, res) => {
      const envIds = envAllowlist();
      if (envIds === null) {
        disabled(res);
        return;
      }
      const raw = req.params.podcastIndexId;
      const podcastIndexId = typeof raw === 'string' ? Number(raw) : Number.NaN;
      if (!Number.isInteger(podcastIndexId) || podcastIndexId < 1) {
        res.status(400).json({ message: 'Invalid podcast index id' });
        return;
      }
      const result = await new CatalogPodcastIndexAllowlistService().removeAdmin(
        podcastIndexId,
        envIds
      );
      if (result === 'on_env_list') {
        res.status(409).json({
          code: 'on_deployment_allowlist',
          message:
            'That id is on the deployment allowlist. Change the deployment list to remove it.',
        });
        return;
      }
      if (result !== 'removed') {
        res.status(404).json({ message: 'Allowlist entry not found' });
        return;
      }
      res.status(204).send();
    }
  );
}
