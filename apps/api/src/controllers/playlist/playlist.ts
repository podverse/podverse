import {
  ensureAuthenticated,
  getAuthenticatedUser,
  optionalEnsureAuthenticated,
} from '@api/lib/auth/index.js';
import { getFollowedPlaylistIdsPrivate } from '@api/lib/followed.js';
import { getParamRequired } from '@api/lib/params.js';
import { getStatsOrder } from '@api/lib/stats.js';
import {
  mediumPageQuerySchema,
  mediumPageRangeQuerySchema,
  playlistIdTextParamSchema,
  validateBodyObject,
  validateParamsObject,
  validateQueryObject,
} from '@api/lib/validation/index.js';
import type { NextFunction, Request, Response } from 'express';
import Joi from 'joi';

import type { QueryParamsQueueMedium } from '@podverse/helpers';
import {
  getAddByRSSHashId,
  getQueueMediumIdFromType,
  MediumEnum,
  PLAYLIST_LIKES_MEMBERSHIP_MAX_IDS,
  QUERY_PARAMS_QUEUE_MEDIUMS,
  SharableStatusEnum,
} from '@podverse/helpers';
import type { ApiListResponse, QueryParamsStatsRange } from '@podverse/helpers-requests';
import type {
  AccountFollowingPlaylist,
  FindManyOptions,
  Playlist,
  StatsAggregatedPlaylist,
} from '@podverse/orm';
import {
  AccountFollowingPlaylistService,
  ClipService,
  ItemService,
  PlaylistResourceService,
  PlaylistService,
  StatsAggregatedPlaylistService,
} from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';
import { getPaginationParams } from '../helpers/pagination.js';

const playlistService = new PlaylistService();

export const verifyPlaylistOwnership = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const account = getAuthenticatedUser(req);
    const playlist_id_text = getParamRequired(req, 'playlist_id_text');

    try {
      const playlist = await playlistService.getByIdText(playlist_id_text, {
        relations: ['account'],
      });
      if (!playlist) {
        res.status(404).json({ message: 'Playlist not found' });
        return;
      }

      if (playlist.account.id !== account.id) {
        res.status(403).json({ message: 'Forbidden' });
        return;
      }

      next();
    } catch (err) {
      handleGenericErrorResponse(res, err);
    }
  };
};

export const verifyPrivatePlaylistOwnershipIfNeeded = () => {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const account = req.user;
    const playlist_id_text = getParamRequired(req, 'playlist_id_text');

    try {
      const playlist = await playlistService.getByIdText(playlist_id_text, {
        relations: ['account', 'sharable_status'],
      });

      if (!playlist) {
        res.status(404).json({ message: 'Playlist not found' });
        return;
      }

      const isOwner = !!account?.id && playlist.account.id === account.id;

      // sharable_status can be either a numeric enum value or a relation object with an id property
      const sharableStatusId =
        typeof playlist.sharable_status === 'number'
          ? playlist.sharable_status
          : (playlist.sharable_status as unknown as { id: number })?.id;
      if (sharableStatusId === SharableStatusEnum.Private) {
        if (!isOwner) {
          res.status(404).json({ message: 'Playlist not found' });
          return;
        }
      }

      next();
    } catch (err) {
      handleGenericErrorResponse(res, err);
    }
  };
};

class PlaylistController {
  private static statsAggregatedPlaylistService = new StatsAggregatedPlaylistService();
  private static playlistResourceService = new PlaylistResourceService();
  private static itemService = new ItemService();
  private static clipService = new ClipService();

  static async createPlaylist(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const schema = Joi.object({
          title: Joi.string().allow(null, ''),
          description: Joi.string().allow(null, ''),
          medium: Joi.string()
            .valid(...QUERY_PARAMS_QUEUE_MEDIUMS)
            .required(),
          sharable_status_id: Joi.number().min(1).required(),
        });

        validateBodyObject(schema, req, res, async () => {
          const account = getAuthenticatedUser(req);

          const { title, description, medium, sharable_status_id } = req.body as {
            title: string;
            description: string;
            medium: QueryParamsQueueMedium;
            sharable_status_id: number;
          };

          const medium_id = getQueueMediumIdFromType(medium);

          if (!medium_id) {
            res.status(400).json({ message: 'Invalid medium type' });
            return;
          }

          const dto = {
            title,
            description,
            medium_id,
            sharable_status_id,
          };

          try {
            const playlist = await playlistService.create(account.id, dto);
            res.status(201).json(playlist);
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      { skipMembershipStatus: false }
    );
  }

  static async updatePlaylist(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateParamsObject(Joi.object(playlistIdTextParamSchema), req, res, async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            const schema = Joi.object({
              title: Joi.string().allow(null, ''),
              description: Joi.string().allow(null, ''),
              sharable_status_id: Joi.number().min(1).required(),
            });

            validateBodyObject(schema, req, res, async () => {
              const account = getAuthenticatedUser(req);
              const playlist_id_text = getParamRequired(req, 'playlist_id_text');

              const { title, description, sharable_status_id } = req.body as {
                title: string;
                description: string;
                sharable_status_id: number;
              };

              const dto = {
                title,
                description,
                sharable_status_id,
              };

              try {
                const playlist = await playlistService.update(account.id, playlist_id_text, dto);
                res.status(200).json(playlist);
              } catch (err) {
                handleGenericErrorResponse(res, err);
              }
            });
          });
        });
      },
      { skipMembershipStatus: false }
    );
  }

  static async deletePlaylist(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateParamsObject(Joi.object(playlistIdTextParamSchema), req, res, async () => {
          verifyPlaylistOwnership()(req, res, async () => {
            const account = getAuthenticatedUser(req);
            const playlist_id_text = getParamRequired(req, 'playlist_id_text');

            try {
              await playlistService.delete(account.id, playlist_id_text);
              res.status(204).end();
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          });
        });
      },
      { skipMembershipStatus: true }
    );
  }

  static async getManyPublicTop(req: Request, res: Response): Promise<void> {
    validateQueryObject(Joi.object(mediumPageRangeQuerySchema), req, res, async () => {
      try {
        const { medium, range } = req.query as {
          medium: QueryParamsQueueMedium;
          range: QueryParamsStatsRange;
        };
        const { page, limit, offset } = getPaginationParams(req);

        const order = getStatsOrder(range);
        const config: FindManyOptions<StatsAggregatedPlaylist> = {
          order: { [order]: 'DESC' },
          skip: offset,
          take: limit,
        };

        const statsResults = await PlaylistController.statsAggregatedPlaylistService.getManyPublic(
          config,
          medium
        );
        const playlists = statsResults
          .map((stat: { playlist: Playlist }) => stat.playlist)
          .filter(Boolean);

        res.status(200).json({
          data: playlists,
          meta: { page },
        });
      } catch (err) {
        handleGenericErrorResponse(res, err);
      }
    });
  }

  static async getManyPrivateTop(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateQueryObject(Joi.object(mediumPageRangeQuerySchema), req, res, async () => {
          try {
            const account = getAuthenticatedUser(req);

            const { medium, range } = req.query as {
              medium: QueryParamsQueueMedium;
              range: QueryParamsStatsRange;
            };

            const { page, limit, offset } = getPaginationParams(req);

            const order = getStatsOrder(range);
            const config: FindManyOptions<StatsAggregatedPlaylist> = {
              order: { [order]: 'DESC' },
              skip: offset,
              take: limit,
            };

            const statsResults =
              await PlaylistController.statsAggregatedPlaylistService.getManyPrivate(
                config,
                account.id,
                medium
              );
            const data = statsResults[0]
              .map((stat: { playlist: Playlist }) => stat.playlist)
              .filter(Boolean);
            const count = statsResults[1];

            const response: ApiListResponse<Playlist> = {
              data: data,
              meta: { page, count, limit },
            };

            res.status(200).json(response);
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      { skipMembershipStatus: true }
    );
  }

  static async getManyPrivateRecent(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateQueryObject(Joi.object(mediumPageQuerySchema), req, res, async () => {
          try {
            const account = getAuthenticatedUser(req);
            const { medium } = req.query as {
              medium: QueryParamsQueueMedium;
            };
            const { page, limit, offset } = getPaginationParams(req);

            const config: FindManyOptions<Playlist> = {
              skip: offset,
              take: limit,
              order: { last_updated: 'DESC' },
            };

            const results = await playlistService.getManyPrivate(account.id, medium, config);

            const response: ApiListResponse<Playlist> = {
              data: results[0],
              meta: { page, count: results[1], limit },
            };

            res.status(200).json(response);
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      { skipMembershipStatus: true }
    );
  }

  static async getManyPrivateOldest(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateQueryObject(Joi.object(mediumPageQuerySchema), req, res, async () => {
          try {
            const account = getAuthenticatedUser(req);
            const { medium } = req.query as {
              medium: QueryParamsQueueMedium;
            };
            const { page, limit, offset } = getPaginationParams(req);

            const config: FindManyOptions<Playlist> = {
              skip: offset,
              take: limit,
              order: { last_updated: 'ASC' },
            };

            const results = await playlistService.getManyPrivate(account.id, medium, config);

            const response: ApiListResponse<Playlist> = {
              data: results[0],
              meta: { page, count: results[1], limit },
            };

            res.status(200).json(response);
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      { skipMembershipStatus: true }
    );
  }

  static async getManyPrivateAZ(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateQueryObject(Joi.object(mediumPageQuerySchema), req, res, async () => {
          try {
            const account = getAuthenticatedUser(req);
            const { medium } = req.query as {
              medium: QueryParamsQueueMedium;
            };
            const { page, limit, offset } = getPaginationParams(req);

            const config: FindManyOptions<Playlist> = {
              skip: offset,
              take: limit,
              order: { title: 'ASC' },
            };

            const results = await playlistService.getManyPrivate(account.id, medium, config);

            const response: ApiListResponse<Playlist> = {
              data: results[0],
              meta: { page, count: results[1], limit },
            };

            res.status(200).json(response);
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      { skipMembershipStatus: true }
    );
  }

  static async getManyFollowedPrivateTop(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateQueryObject(Joi.object(mediumPageRangeQuerySchema), req, res, async () => {
          const { page, limit, offset } = getPaginationParams(req);
          const { range, medium } = req.query as {
            range: QueryParamsStatsRange;
            medium: QueryParamsQueueMedium;
          };
          const jwtUser = getAuthenticatedUser(req);
          const account_id = jwtUser.id;

          const playlist_ids = await getFollowedPlaylistIdsPrivate(account_id, medium);
          const order = getStatsOrder(range);
          const config: FindManyOptions<StatsAggregatedPlaylist> = {
            order: { [order]: 'DESC' },
            skip: offset,
            take: limit,
            relations: ['playlist', 'playlist.account', 'playlist.account.account_profile'],
          };
          const statsResults =
            await PlaylistController.statsAggregatedPlaylistService.getManyPrivateByPlaylists(
              playlist_ids,
              config
            );

          const playlists = statsResults[0]
            .map((stat: { playlist: Playlist }) => stat.playlist)
            .filter(Boolean);
          const count = statsResults[1];

          const response: ApiListResponse<Playlist> = {
            data: playlists,
            meta: { page, count, limit },
          };
          res.json(response);
        });
      },
      { skipMembershipStatus: true }
    );
  }

  static async getManyFollowedPrivateRecent(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateQueryObject(Joi.object(mediumPageQuerySchema), req, res, async () => {
          const { page, limit, offset } = getPaginationParams(req);
          const { medium } = req.query as {
            medium: QueryParamsQueueMedium;
          };
          const jwtUser = getAuthenticatedUser(req);
          const account_id = jwtUser.id;

          const accountFollowingPlaylistService = new AccountFollowingPlaylistService();
          const config: FindManyOptions<AccountFollowingPlaylist> = {
            skip: offset,
            take: limit,
            relations: ['playlist', 'playlist.account', 'playlist.account.account_profile'],
            order: { playlist: { last_updated: 'DESC' } },
          };
          const results =
            await accountFollowingPlaylistService.getFollowedPlaylistsPrivateWithCount(
              account_id,
              medium,
              config
            );
          const playlists = results[0]
            .map(
              (account_following_playlist: { playlist: Playlist }) =>
                account_following_playlist.playlist
            )
            .filter(Boolean);
          const count = results[1];

          const response: ApiListResponse<Playlist> = {
            data: playlists,
            meta: { page, count, limit },
          };
          res.json(response);
        });
      },
      { skipMembershipStatus: true }
    );
  }

  static async getManyFollowedPrivateOldest(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateQueryObject(Joi.object(mediumPageQuerySchema), req, res, async () => {
          const { page, limit, offset } = getPaginationParams(req);
          const { medium } = req.query as {
            medium: QueryParamsQueueMedium;
          };
          const jwtUser = getAuthenticatedUser(req);
          const account_id = jwtUser.id;

          const accountFollowingPlaylistService = new AccountFollowingPlaylistService();
          const config: FindManyOptions<AccountFollowingPlaylist> = {
            skip: offset,
            take: limit,
            relations: ['playlist', 'playlist.account', 'playlist.account.account_profile'],
            order: { playlist: { last_updated: 'ASC' } },
          };
          const results =
            await accountFollowingPlaylistService.getFollowedPlaylistsPrivateWithCount(
              account_id,
              medium,
              config
            );
          const playlists = results[0]
            .map(
              (account_following_playlist: { playlist: Playlist }) =>
                account_following_playlist.playlist
            )
            .filter(Boolean);
          const count = results[1];

          const response: ApiListResponse<Playlist> = {
            data: playlists,
            meta: { page, count, limit },
          };
          res.json(response);
        });
      },
      { skipMembershipStatus: true }
    );
  }

  static async getManyFollowedPrivateAZ(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateQueryObject(Joi.object(mediumPageQuerySchema), req, res, async () => {
          const { page, limit, offset } = getPaginationParams(req);
          const { medium } = req.query as {
            medium: QueryParamsQueueMedium;
          };
          const jwtUser = getAuthenticatedUser(req);
          const account_id = jwtUser.id;

          const accountFollowingPlaylistService = new AccountFollowingPlaylistService();
          const config: FindManyOptions<AccountFollowingPlaylist> = {
            skip: offset,
            take: limit,
            relations: ['playlist', 'playlist.account', 'playlist.account.account_profile'],
            order: { playlist: { title: 'ASC' } },
          };
          const results =
            await accountFollowingPlaylistService.getFollowedPlaylistsPrivateWithCount(
              account_id,
              medium,
              config
            );
          const playlists = results[0]
            .map(
              (account_following_playlist: { playlist: Playlist }) =>
                account_following_playlist.playlist
            )
            .filter(Boolean);
          const count = results[1];

          const response: ApiListResponse<Playlist> = {
            data: playlists,
            meta: { page, count, limit },
          };
          res.json(response);
        });
      },
      { skipMembershipStatus: true }
    );
  }

  static async getAllLikesPrivate(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const account = getAuthenticatedUser(req);
          const includeResources = req.query['include_resources'] !== '0';
          const likes = await playlistService.getAllLikesPrivate(account.id, includeResources);
          res.status(200).json(likes);
        } catch (err) {
          handleGenericErrorResponse(res, err);
        }
      },
      { skipMembershipStatus: true }
    );
  }

  static async getLikesMembership(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateBodyObject(
          Joi.object({
            item_id_texts: Joi.array()
              .items(Joi.string())
              .max(PLAYLIST_LIKES_MEMBERSHIP_MAX_IDS)
              .default([]),
            clip_id_texts: Joi.array()
              .items(Joi.string())
              .max(PLAYLIST_LIKES_MEMBERSHIP_MAX_IDS)
              .default([]),
            add_by_rss_hash_ids: Joi.array()
              .items(Joi.string())
              .max(PLAYLIST_LIKES_MEMBERSHIP_MAX_IDS)
              .default([]),
          }),
          req,
          res,
          async () => {
            try {
              const account = getAuthenticatedUser(req);
              const membership = await playlistService.getLikesMembership(account.id, req.body);
              res.status(200).json(membership);
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          }
        );
      },
      { skipMembershipStatus: true }
    );
  }

  static async toggleLike(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateBodyObject(
          Joi.object({
            resource_type: Joi.string().valid('item', 'clip', 'add_by_rss').required(),
            item_id_text: Joi.string().when('resource_type', {
              is: 'item',
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            clip_id_text: Joi.string().when('resource_type', {
              is: 'clip',
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            add_by_rss_hash_id: Joi.string().when('resource_type', {
              is: 'add_by_rss',
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
            add_by_rss_resource_data: Joi.object().when('resource_type', {
              is: 'add_by_rss',
              then: Joi.required(),
              otherwise: Joi.optional(),
            }),
          }),
          req,
          res,
          async () => {
            try {
              const account = getAuthenticatedUser(req);
              const resourceTypeRaw = req.body.resource_type;
              if (
                resourceTypeRaw !== 'item' &&
                resourceTypeRaw !== 'clip' &&
                resourceTypeRaw !== 'add_by_rss'
              ) {
                res.status(400).json({ message: 'Invalid resource type' });
                return;
              }
              const resourceType = resourceTypeRaw;
              const itemIdText =
                typeof req.body.item_id_text === 'string' ? req.body.item_id_text : '';
              const clipIdText =
                typeof req.body.clip_id_text === 'string' ? req.body.clip_id_text : '';
              const addByRSSHashIdFromBody =
                typeof req.body.add_by_rss_hash_id === 'string' ? req.body.add_by_rss_hash_id : '';
              const addByRSSResourceData =
                req.body.add_by_rss_resource_data &&
                typeof req.body.add_by_rss_resource_data === 'object'
                  ? req.body.add_by_rss_resource_data
                  : {};

              if (resourceType === 'item') {
                const item = await PlaylistController.itemService.getByIdText(itemIdText, {
                  channel: true,
                });
                if (!item) {
                  res.status(404).json({ message: 'Item not found' });
                  return;
                }

                const mediumId =
                  item.channel.medium_id === MediumEnum.Music ||
                  item.channel.medium_id === MediumEnum.PublisherMusic
                    ? MediumEnum.Music
                    : MediumEnum.AV;
                const likesPlaylist = await playlistService.getOrCreateDefaultLikesPlaylist(
                  account.id,
                  mediumId
                );
                const liked = await playlistService.hasItemLike(likesPlaylist.id, item.id);

                if (liked) {
                  await PlaylistController.playlistResourceService.removeItemFromPlaylist(
                    likesPlaylist.id_text,
                    item.id_text
                  );
                } else {
                  await PlaylistController.playlistResourceService.addItemToPlaylistLast(
                    likesPlaylist.id_text,
                    item.id_text
                  );
                }

                res.status(200).json({ liked: !liked, resource_type: resourceType });
                return;
              }

              if (resourceType === 'clip') {
                const clip = await PlaylistController.clipService.getByIdText(clipIdText);
                if (!clip) {
                  res.status(404).json({ message: 'Clip not found' });
                  return;
                }

                const likesPlaylist = await playlistService.getOrCreateDefaultLikesPlaylist(
                  account.id,
                  MediumEnum.AV
                );
                const liked = await playlistService.hasClipLike(likesPlaylist.id, clip.id);

                if (liked) {
                  await PlaylistController.playlistResourceService.removeClipFromPlaylist(
                    likesPlaylist.id_text,
                    clip.id_text
                  );
                } else {
                  await PlaylistController.playlistResourceService.addClipToPlaylistLast(
                    likesPlaylist.id_text,
                    clip.id_text
                  );
                }

                res.status(200).json({ liked: !liked, resource_type: resourceType });
                return;
              }

              const addByRSSHashId =
                addByRSSHashIdFromBody || getAddByRSSHashId(addByRSSResourceData);

              const likesPlaylist = await playlistService.getOrCreateDefaultLikesPlaylist(
                account.id,
                MediumEnum.AV
              );
              const liked = await playlistService.hasAddByRSSLike(likesPlaylist.id, addByRSSHashId);

              if (liked) {
                await PlaylistController.playlistResourceService.removeItemAddByRSSFromPlaylist(
                  likesPlaylist.id_text,
                  addByRSSHashId
                );
              } else {
                await PlaylistController.playlistResourceService.addItemAddByRSSToPlaylistLast(
                  likesPlaylist.id_text,
                  addByRSSResourceData
                );
              }

              res.status(200).json({ liked: !liked, resource_type: resourceType });
            } catch (err) {
              handleGenericErrorResponse(res, err);
            }
          }
        );
      },
      { skipMembershipStatus: true }
    );
  }

  static async getPlaylistById(req: Request, res: Response): Promise<void> {
    validateParamsObject(Joi.object(playlistIdTextParamSchema), req, res, async () => {
      optionalEnsureAuthenticated(
        req,
        res,
        async () => {
          verifyPrivatePlaylistOwnershipIfNeeded()(req, res, async () => {
            try {
              const playlist_id_text = getParamRequired(req, 'playlist_id_text');
              const account = req.user;

              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              let playlist: any | null = null;

              if (account) {
                playlist = await playlistService.getOnePrivate(account.id_text, playlist_id_text);
              } else {
                playlist = await playlistService.getOnePublic(playlist_id_text);
              }

              if (playlist?.account?.id) {
                delete playlist.account.id;
              }

              if (playlist) {
                res.status(200).json(playlist);
              } else {
                res.status(404).json({ message: 'Playlist not found' });
              }
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

export { PlaylistController };
