import { Request, Response } from 'express';
import Joi from 'joi';
import { PlaylistResourceService } from '@podverse/orm';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error';
import { verifyPlaylistOwnership } from '@api/controllers/playlist/playlist';
import { ensureAuthenticated } from '@api/lib/auth';
import {
  itemIdTextParamSchema,
  playlistIdTextParamSchema,
  positionBetweenBodySchema,
  validateBodyObject,
  validateParamsObject,
} from '@api/lib/validation';
import { getParamRequired } from '@api/lib/params';

class PlaylistResourceItemController {
  private static playlistResourceService = new PlaylistResourceService();

  static async addItemToPlaylistFirst(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...playlistIdTextParamSchema,
      ...itemIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            const playlist_id_text = getParamRequired(req, 'playlist_id_text');
            const item_id_text = getParamRequired(req, 'item_id_text');

            try {
              const playlistResource =
                await PlaylistResourceItemController.playlistResourceService.addItemToPlaylistFirst(
                  playlist_id_text,
                  item_id_text
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

  static async addItemToPlaylistLast(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...playlistIdTextParamSchema,
      ...itemIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            try {
              const playlist_id_text = getParamRequired(req, 'playlist_id_text');
              const item_id_text = getParamRequired(req, 'item_id_text');
              const playlistResource =
                await PlaylistResourceItemController.playlistResourceService.addItemToPlaylistLast(
                  playlist_id_text,
                  item_id_text
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

  static async addItemToPlaylistBetween(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...playlistIdTextParamSchema,
      ...itemIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            validateBodyObject(Joi.object(positionBetweenBodySchema), req, res, async () => {
              try {
                const playlist_id_text = getParamRequired(req, 'playlist_id_text');
                const item_id_text = getParamRequired(req, 'item_id_text');
                const { position1, position2 } = req.body;
                const playlistResource =
                  await PlaylistResourceItemController.playlistResourceService.addItemToPlaylistBetween(
                    playlist_id_text,
                    item_id_text,
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

  static async removeItemFromPlaylist(req: Request, res: Response): Promise<void> {
    const paramsSchema = Joi.object({
      ...playlistIdTextParamSchema,
      ...itemIdTextParamSchema,
    });

    validateParamsObject(paramsSchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            try {
              const playlist_id_text = getParamRequired(req, 'playlist_id_text');
              const item_id_text = getParamRequired(req, 'item_id_text');
              await PlaylistResourceItemController.playlistResourceService.removeItemFromPlaylist(
                playlist_id_text,
                item_id_text
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

export { PlaylistResourceItemController };
