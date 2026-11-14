import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { loggerService } from '@api/factories/loggerService.js';
import { rateLimitEndpoint } from '@api/lib/rateLimiter.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type {
  DTOLegacyPodcastLookupAnswer,
  DTOLegacyPodcastLookupResponse,
} from '@podverse/helpers';
import { LEGACY_INSTALL_ID_HEADER, LEGACY_PODCAST_LOOKUP_MAX_IDS } from '@podverse/helpers';
import { LegacyPodcastLookupService } from '@podverse/orm';

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
