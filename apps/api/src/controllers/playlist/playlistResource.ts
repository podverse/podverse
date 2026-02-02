import type { Request, Response } from 'express';
import Joi from 'joi';
import type { PlaylistResourceIdTextOptions } from '@podverse/helpers';
import type { FindManyOptions, PlaylistResource } from '@podverse/orm';
import { PlaylistResourceService } from '@podverse/orm';
import { handleGenericErrorResponse } from '../helpers/error.js';
import {
  pageDefaultQuerySchema,
  playlistIdTextParamSchema,
  validateParamsObject,
  validateQueryObject,
} from '@api/lib/validation/index.js';
import { verifyPlaylistOwnership, verifyPrivatePlaylistOwnershipIfNeeded } from './playlist.js';
import {
  ensureAuthenticated,
  optionalEnsureAuthenticated,
  getAuthenticatedUser,
} from '@api/lib/auth/index.js';
import { getPaginationParams } from '../helpers/pagination.js';
import { getParamRequired } from '@api/lib/params.js';

class PlaylistResourceController {
  private static playlistResourceService = new PlaylistResourceService();

  static async getAllByPlaylistIdTextPrivate(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(playlistIdTextParamSchema), req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            const playlist_id_text = getParamRequired(req, 'playlist_id_text');
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;

            try {
              const playlistResources =
                await PlaylistResourceController.playlistResourceService.getAllByPlaylistIdText(
                  playlist_id_text,
                  account_id
                );
              res.status(200).json(playlistResources);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        },
        { skipMembershipStatus: true }
      );
    });
  }

  static async getManyForQueueByListPosition(req: Request, res: Response): Promise<void> {
    const querySchema = Joi.object({
      item_id_text: Joi.string().optional(),
      clip_id_text: Joi.string().optional(),
      item_soundbite_id_text: Joi.string().optional(),
      direction: Joi.string().valid('forward', 'backward').required(),
    });

    validateParamsObject(Joi.object(playlistIdTextParamSchema), req, res, async () => {
      validateQueryObject(querySchema, req, res, async () => {
        optionalEnsureAuthenticated(
          req,
          res,
          async () => {
            const playlist_id_text = getParamRequired(req, 'playlist_id_text');
            const { item_id_text, clip_id_text, item_soundbite_id_text, direction } = req.query as {
              item_id_text?: PlaylistResourceIdTextOptions['item_id_text'];
              clip_id_text?: PlaylistResourceIdTextOptions['clip_id_text'];
              item_soundbite_id_text?: PlaylistResourceIdTextOptions['item_soundbite_id_text'];
              direction: 'forward' | 'backward';
            };
            const account_id = req.user?.id || null;

            if (!item_id_text && !clip_id_text && !item_soundbite_id_text) {
              res.status(400).json({
                message:
                  'One of item_id_text, clip_id_text, or item_soundbite_id_text must be provided',
              });
              return;
            }

            try {
              const idTextOptions: PlaylistResourceIdTextOptions = {};
              if (item_id_text) {
                idTextOptions.item_id_text = item_id_text;
              }
              if (clip_id_text) {
                idTextOptions.clip_id_text = clip_id_text;
              }
              if (item_soundbite_id_text) {
                idTextOptions.item_soundbite_id_text = item_soundbite_id_text;
              }
              const playlistResources =
                await PlaylistResourceController.playlistResourceService.getManyForQueueByListPosition(
                  playlist_id_text,
                  idTextOptions,
                  direction,
                  account_id
                );
              res.json({ data: playlistResources });
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          },
          { skipMembershipStatus: true }
        );
      });
    });
  }

  static async getManyByPlaylistShuffle(req: Request, res: Response): Promise<void> {
    const querySchema = Joi.object({
      ...pageDefaultQuerySchema,
      shuffleHash: Joi.string().required(),
    });

    validateParamsObject(Joi.object(playlistIdTextParamSchema), req, res, async () => {
      validateQueryObject(querySchema, req, res, async () => {
        optionalEnsureAuthenticated(
          req,
          res,
          async () => {
            verifyPrivatePlaylistOwnershipIfNeeded()(req, res, async () => {
              const playlist_id_text = getParamRequired(req, 'playlist_id_text');
              const { page, limit, offset } = getPaginationParams(req);
              const { shuffleHash } = req.query as { shuffleHash: string };
              const account_id = req.user?.id || null;

              try {
                const config: FindManyOptions<PlaylistResource> = {
                  skip: offset,
                  take: limit,
                };
                const playlistResources =
                  await PlaylistResourceController.playlistResourceService.getManyByPlaylistShuffle(
                    playlist_id_text,
                    shuffleHash,
                    account_id,
                    config
                  );
                const totalCount =
                  await PlaylistResourceController.playlistResourceService.getAllByPlaylistIdTextCount(
                    playlist_id_text
                  );

                res.status(200).json({
                  data: playlistResources,
                  meta: { page, count: totalCount, limit },
                });
              } catch (err) {
                handleGenericErrorResponse(res, err);
              }
            });
          },
          { skipMembershipStatus: true }
        );
      });
    });
  }

  static async getManyByPlaylistIdText(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(playlistIdTextParamSchema), req, res, async () => {
      optionalEnsureAuthenticated(
        req,
        res,
        async () => {
          verifyPrivatePlaylistOwnershipIfNeeded()(req, res, async () => {
            const playlist_id_text = getParamRequired(req, 'playlist_id_text');
            const { page, limit, offset } = getPaginationParams(req);
            const account_id = req.user?.id || null;

            try {
              const playlistResources =
                await PlaylistResourceController.playlistResourceService.getManyByPlaylistIdText(
                  playlist_id_text,
                  account_id,
                  {
                    skip: offset,
                    take: limit,
                  }
                );
              const totalCount =
                await PlaylistResourceController.playlistResourceService.getAllByPlaylistIdTextCount(
                  playlist_id_text
                );

              res.status(200).json({
                data: playlistResources,
                meta: { page, count: totalCount, limit },
              });
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        },
        { skipMembershipStatus: true }
      );
    });
  }
}

export { PlaylistResourceController };
