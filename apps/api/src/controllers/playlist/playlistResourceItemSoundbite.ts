import type { Request, Response } from 'express';
import Joi from 'joi';
import { PlaylistResourceService } from '@podverse/orm';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { verifyPlaylistOwnership } from '@api/controllers/playlist/playlist.js';
import { ensureAuthenticated } from '@api/lib/auth/index.js';
import {
  playlistIdTextParamSchema,
  positionBetweenBodySchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation/index.js';
import { getParamRequired } from '@api/lib/params.js';

class PlaylistResourceItemSoundbiteController {
  private static playlistResourceService = new PlaylistResourceService();

  static async addItemSoundbiteToPlaylistFirst(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...playlistIdTextParamSchema,
      soundbite_id_text: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            const playlist_id_text = getParamRequired(req, 'playlist_id_text');
            const soundbite_id_text = getParamRequired(req, 'soundbite_id_text');

            try {
              const playlistResource =
                await PlaylistResourceItemSoundbiteController.playlistResourceService.addItemSoundbiteToPlaylistFirst(
                  playlist_id_text,
                  soundbite_id_text
                );
              res.status(201).json(playlistResource);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        },
        { skipMembershipStatus: false }
      );
    });
  }

  static async addItemSoundbiteToPlaylistLast(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...playlistIdTextParamSchema,
      soundbite_id_text: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            const playlist_id_text = getParamRequired(req, 'playlist_id_text');
            const soundbite_id_text = getParamRequired(req, 'soundbite_id_text');

            try {
              const playlistResource =
                await PlaylistResourceItemSoundbiteController.playlistResourceService.addItemSoundbiteToPlaylistLast(
                  playlist_id_text,
                  soundbite_id_text
                );
              res.status(201).json(playlistResource);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        },
        { skipMembershipStatus: false }
      );
    });
  }

  static async addItemSoundbiteToPlaylistBetween(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...playlistIdTextParamSchema,
      soundbite_id_text: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            validateBodyObject(Joi.object(positionBetweenBodySchema), req, res, async () => {
              const playlist_id_text = getParamRequired(req, 'playlist_id_text');
              const soundbite_id_text = getParamRequired(req, 'soundbite_id_text');
              const { position1, position2 } = req.body;

              try {
                const playlistResource =
                  await PlaylistResourceItemSoundbiteController.playlistResourceService.addItemSoundbiteToPlaylistBetween(
                    playlist_id_text,
                    soundbite_id_text,
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

  static async removeItemSoundbiteFromPlaylist(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...playlistIdTextParamSchema,
      soundbite_id_text: Joi.string().required(),
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            const playlist_id_text = getParamRequired(req, 'playlist_id_text');
            const soundbite_id_text = getParamRequired(req, 'soundbite_id_text');

            try {
              await PlaylistResourceItemSoundbiteController.playlistResourceService.removeItemSoundbiteFromPlaylist(
                playlist_id_text,
                soundbite_id_text
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

export { PlaylistResourceItemSoundbiteController };
