import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import {
  CatalogPodcastIndexAllowlistService,
  ChannelMergeRedirectService,
  IDENTITY_RESOLVE_MAX_IDS,
} from '@podverse/orm';

const idList = Joi.array().items(Joi.string().trim().min(1).max(64)).max(IDENTITY_RESOLVE_MAX_IDS);

const resolveSchema = Joi.object({
  channel_id_texts: idList,
  item_id_texts: idList,
  podcast_index_ids: Joi.array()
    .items(Joi.number().integer().min(1).max(2147483647))
    .max(IDENTITY_RESOLVE_MAX_IDS),
}).or('channel_id_texts', 'item_id_texts', 'podcast_index_ids');

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids: string[] = [];
  for (const entry of value) {
    if (typeof entry === 'string' && entry.length > 0) {
      ids.push(entry);
    }
  }
  return ids;
}

function numberList(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const ids: number[] = [];
  for (const entry of value) {
    if (typeof entry === 'number' && Number.isInteger(entry)) {
      ids.push(entry);
    }
  }
  return ids;
}

export class IdentityController {
  private static redirectService = new ChannelMergeRedirectService();
  private static allowlist = new CatalogPodcastIndexAllowlistService();

  static async resolve(req: Request, res: Response): Promise<void> {
    validateBodyObject(resolveSchema, req, res, async () => {
      try {
        const record = isRecord(req.body) ? req.body : {};
        const channelIdTexts = stringList(record.channel_id_texts);
        const itemIdTexts = stringList(record.item_id_texts);
        const podcastIndexIds = numberList(record.podcast_index_ids);
        if (channelIdTexts.length + itemIdTexts.length + podcastIndexIds.length === 0) {
          res.status(400).json({ message: 'At least one id is required' });
          return;
        }
        const resolved = await IdentityController.redirectService.resolve({
          channelIdTexts,
          itemIdTexts,
          podcastIndexIds,
        });
        const moved = new Set(resolved.podcast_index_ids.map((move) => move.from));
        const remaining = podcastIndexIds.filter((id) => !moved.has(id));
        const allowlistMoves =
          await IdentityController.allowlist.channelMovesForListedIds(remaining);
        res.json({
          ...resolved,
          podcast_index_ids: [...resolved.podcast_index_ids, ...allowlistMoves],
        });
      } catch (error) {
        handleGenericErrorResponse(res, error);
      }
    });
  }
}
