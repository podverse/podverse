import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { loggerService } from '@api/factories/loggerService.js';
import { rateLimitEndpoint } from '@api/lib/rateLimiter.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type {
  DTOLegacyEpisodeLookupAnswer,
  DTOLegacyEpisodeLookupRef,
  DTOLegacyEpisodeLookupResponse,
  DTOLegacyPodcastLookupAnswer,
  DTOLegacyPodcastLookupResponse,
} from '@podverse/helpers';
import {
  LEGACY_EPISODE_LOOKUP_MAX_EPISODES,
  LEGACY_INSTALL_ID_HEADER,
  LEGACY_PODCAST_LOOKUP_MAX_IDS,
} from '@podverse/helpers';
import { LegacyEpisodeLookupService, LegacyPodcastLookupService } from '@podverse/orm';

const INSTALL_ID_PATTERN = /^[A-Za-z0-9_-]{16,64}$/;

const lookupBodySchema = Joi.object({
  podcast_ids: Joi.array()
    .items(Joi.string().trim().min(1).max(14))
    .min(1)
    .max(LEGACY_PODCAST_LOOKUP_MAX_IDS)
    .required(),
});

function installIdFromRequest(req: Request): string | null {
  const header = req.get(LEGACY_INSTALL_ID_HEADER);
  if (header === undefined || !INSTALL_ID_PATTERN.test(header)) {
    return null;
  }
  return header;
}

export const legacyPodcastLookupIpRateLimit = rateLimitEndpoint({
  windowMs: config.rateLimits.legacyPodcastLookup.windowMs,
  max: config.rateLimits.legacyPodcastLookup.max,
});

export const legacyPodcastLookupInstallRateLimit = rateLimitEndpoint({
  windowMs: config.rateLimits.legacyPodcastLookupInstall.windowMs,
  max: config.rateLimits.legacyPodcastLookupInstall.max,
  keyGenerator: (req) => {
    const installId = installIdFromRequest(req);
    return installId === null ? 'install:skipped' : `install:${installId}`;
  },
  skip: (req) => installIdFromRequest(req) === null,
});

const episodeLookupBodySchema = Joi.object({
  episodes: Joi.array()
    .items(
      Joi.object({
        episode_id: Joi.string().trim().min(1).max(14).required(),
        podcast_id: Joi.string().trim().min(1).max(14).required(),
        guid: Joi.string().trim().max(2048).allow(null, '').required(),
        media_url: Joi.string().trim().max(2048).allow(null, '').required(),
      })
    )
    .min(1)
    .max(LEGACY_EPISODE_LOOKUP_MAX_EPISODES)
    .required(),
});

export const legacyEpisodeLookupIpRateLimit = rateLimitEndpoint({
  windowMs: config.rateLimits.legacyEpisodeLookup.windowMs,
  max: config.rateLimits.legacyEpisodeLookup.max,
});

export const legacyEpisodeLookupInstallRateLimit = rateLimitEndpoint({
  windowMs: config.rateLimits.legacyEpisodeLookupInstall.windowMs,
  max: config.rateLimits.legacyEpisodeLookupInstall.max,
  keyGenerator: (req) => {
    const installId = installIdFromRequest(req);
    return installId === null ? 'install:skipped' : `install:${installId}`;
  },
  skip: (req) => installIdFromRequest(req) === null,
});

function readPodcastIds(body: unknown): string[] | null {
  if (typeof body !== 'object' || body === null || !('podcast_ids' in body)) {
    return null;
  }
  const { podcast_ids } = body;
  if (!Array.isArray(podcast_ids)) {
    return null;
  }
  const ids: string[] = [];
  for (const id of podcast_ids) {
    if (typeof id !== 'string') {
      return null;
    }
    ids.push(id);
  }
  return ids;
}

function countByKind(
  answers: readonly DTOLegacyPodcastLookupAnswer[]
): Record<DTOLegacyPodcastLookupAnswer['kind'], number> {
  const counts = { channel: 0, feed_url: 0, blocked: 0, not_here: 0 };
  for (const answer of answers) {
    counts[answer.kind] += 1;
  }
  return counts;
}

export const LegacyPodcastLookupController = {
  service: new LegacyPodcastLookupService(),

  async lookup(req: Request, res: Response): Promise<void> {
    validateBodyObject(lookupBodySchema, req, res, async () => {
      const podcastIds = readPodcastIds(req.body);
      if (podcastIds === null) {
        res.status(400).json({ message: '"podcast_ids" must be an array of strings' });
        return;
      }
      try {
        const answers = await LegacyPodcastLookupController.service.lookup(podcastIds);
        loggerService.info('Legacy podcast lookup', {
          idsAsked: podcastIds.length,
          answers: countByKind(answers),
        });
        const body: DTOLegacyPodcastLookupResponse = { answers };
        res.json(body);
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  },
};

function emptyToNull(value: string | null): string | null {
  if (value === null || value.length === 0) {
    return null;
  }
  return value;
}

function isEpisodeRefEntry(value: unknown): value is {
  episode_id: unknown;
  podcast_id: unknown;
  guid: unknown;
  media_url: unknown;
} {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }
  return 'episode_id' in value && 'podcast_id' in value && 'guid' in value && 'media_url' in value;
}

function readEpisodeRefs(body: unknown): DTOLegacyEpisodeLookupRef[] | null {
  if (typeof body !== 'object' || body === null || !('episodes' in body)) {
    return null;
  }
  const { episodes } = body;
  if (!Array.isArray(episodes)) {
    return null;
  }
  const refs: DTOLegacyEpisodeLookupRef[] = [];
  for (const entry of episodes) {
    if (!isEpisodeRefEntry(entry)) {
      return null;
    }
    const { episode_id, podcast_id, guid, media_url } = entry;
    if (typeof episode_id !== 'string' || typeof podcast_id !== 'string') {
      return null;
    }
    if (guid !== null && typeof guid !== 'string') {
      return null;
    }
    if (media_url !== null && typeof media_url !== 'string') {
      return null;
    }
    refs.push({
      episode_id,
      podcast_id,
      guid: emptyToNull(guid),
      media_url: emptyToNull(media_url),
    });
  }
  return refs;
}

function countEpisodeAnswersByKind(
  answers: readonly DTOLegacyEpisodeLookupAnswer[]
): Record<DTOLegacyEpisodeLookupAnswer['kind'], number> {
  const counts = { item: 0, channel: 0, feed_url: 0, blocked: 0, not_here: 0 };
  for (const answer of answers) {
    counts[answer.kind] += 1;
  }
  return counts;
}

export const LegacyEpisodeLookupController = {
  service: new LegacyEpisodeLookupService(),

  async lookup(req: Request, res: Response): Promise<void> {
    validateBodyObject(episodeLookupBodySchema, req, res, async () => {
      const refs = readEpisodeRefs(req.body);
      if (refs === null) {
        res.status(400).json({ message: '"episodes" must be an array of episode refs' });
        return;
      }
      try {
        const answers = await LegacyEpisodeLookupController.service.lookup(refs);
        loggerService.info('Legacy episode lookup', {
          episodesAsked: refs.length,
          answers: countEpisodeAnswersByKind(answers),
        });
        const body: DTOLegacyEpisodeLookupResponse = { answers };
        res.json(body);
      } catch (error) {
        handleGenericErrorResponse(res, error);
        return;
      }
    });
  },
};
