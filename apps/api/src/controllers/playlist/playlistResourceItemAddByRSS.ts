import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { verifyPlaylistOwnership } from '@api/controllers/playlist/playlist.js';
import { ensureAuthenticated } from '@api/lib/auth/index.js';
import { getParamRequired } from '@api/lib/params.js';
import {
  playlistIdTextParamSchema,
  positionBetweenBodySchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { PlaylistResourceService } from '@podverse/orm';

class PlaylistResourceItemAddByRSSController {
  private static playlistResourceService = new PlaylistResourceService();

  static async addItemAddByRSSToPlaylistFirst(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      add_by_rss_resource_data: Joi.object().required(),
    });

    validateParamsObject(Joi.object(playlistIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            validateBodyObject(bodySchema, req, res, async () => {
              const playlist_id_text = getParamRequired(req, 'playlist_id_text');
              const { add_by_rss_resource_data } = req.body;

              try {
                const playlistResource =
                  await PlaylistResourceItemAddByRSSController.playlistResourceService.addItemAddByRSSToPlaylistFirst(
                    playlist_id_text,
                    add_by_rss_resource_data
                  );
                res.status(201).json(playlistResource);
              } catch (err) {
                handleGenericErrorResponse(res, err);
              }
            });
          });
        },
        { skipMembershipStatus: false }
      );
    });
  }

  static async addItemAddByRSSToPlaylistLast(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      add_by_rss_resource_data: Joi.object().required(),
    });

    validateParamsObject(Joi.object(playlistIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            validateBodyObject(bodySchema, req, res, async () => {
              const playlist_id_text = getParamRequired(req, 'playlist_id_text');
              const { add_by_rss_resource_data } = req.body;

              try {
                const playlistResource =
                  await PlaylistResourceItemAddByRSSController.playlistResourceService.addItemAddByRSSToPlaylistLast(
                    playlist_id_text,
                    add_by_rss_resource_data
                  );
                res.status(201).json(playlistResource);
              } catch (err) {
                handleGenericErrorResponse(res, err);
              }
            });
          });
        },
        { skipMembershipStatus: false }
      );
    });
  }

  static async addItemAddByRSSToPlaylistBetween(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      add_by_rss_resource_data: Joi.object().required(),
      ...positionBetweenBodySchema,
    });

    validateParamsObject(Joi.object(playlistIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            validateBodyObject(bodySchema, req, res, async () => {
              const playlist_id_text = getParamRequired(req, 'playlist_id_text');
              const { add_by_rss_resource_data, position1, position2 } = req.body;

              try {
                const playlistResource =
                  await PlaylistResourceItemAddByRSSController.playlistResourceService.addItemAddByRSSToPlaylistBetween(
                    playlist_id_text,
                    add_by_rss_resource_data,
                    position1,
                    position2
                  );
                res.status(201).json(playlistResource);
              } catch (err) {
                handleGenericErrorResponse(res, err);
              }
            });
          });
        },
        { skipMembershipStatus: false }
      );
    });
  }

  static async removeItemAddByRSSFromPlaylist(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...playlistIdTextParamSchema,
      add_by_rss_hash_id: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            const playlist_id_text = getParamRequired(req, 'playlist_id_text');
            const add_by_rss_hash_id = getParamRequired(req, 'add_by_rss_hash_id');

            try {
              await PlaylistResourceItemAddByRSSController.playlistResourceService.removeItemAddByRSSFromPlaylist(
                playlist_id_text,
                add_by_rss_hash_id
              );
              res.status(204).end();
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        },
        { skipMembershipStatus: true }
      );
    });
  }

  // TODO: add favorites add to next/prev handling
}

export { PlaylistResourceItemAddByRSSController };
