import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { assertListenStatsAllowed, ListenStatsOptedOutError } from '@api/lib/legal/listenStats.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { PopularityListenResult } from '@podverse/helpers';
import {
  ACCOUNT_ENTITLEMENT_CAPABILITY,
  membershipCountsTowardPopularity,
} from '@podverse/helpers';
import type { StatsListenTarget } from '@podverse/orm';
import { CLIP_SOURCE_REMOVED_MESSAGE, StatsListenWriteService } from '@podverse/orm';

/** 403 body when the account's Taste Profile consent is missing or out of date. */
export const TASTE_PROFILE_CONSENT_REQUIRED_BODY = {
  message: 'Listen stats tracking is disabled for this account',
  code: 'taste_profile_consent_required',
};

export const STATS_TARGET_NOT_FOUND_BODY = { message: 'Not found', code: 'not_found' };

/** Upper bound on `seconds_heard`: one day of media. */
const MAX_SECONDS_HEARD = 86400;

type StatsListenBody = (
  | { item_id_text: string; clip_id_text?: undefined }
  | { clip_id_text: string; item_id_text?: undefined }
) & {
  client_listen_id: string;
  seconds_heard: number;
  completed: boolean;
  media_duration_seconds?: number;
};

const bodySchema = Joi.object({
  item_id_text: Joi.string(),
  clip_id_text: Joi.string(),
  client_listen_id: Joi.string().uuid().required(),
  seconds_heard: Joi.number().integer().min(0).max(MAX_SECONDS_HEARD).required(),
  completed: Joi.boolean().default(false),
  media_duration_seconds: Joi.number().positive().max(MAX_SECONDS_HEARD),
}).xor('item_id_text', 'clip_id_text');

function listenTarget(body: StatsListenBody): StatsListenTarget {
  if (body.clip_id_text !== undefined) {
    return { kind: 'clip', id_text: body.clip_id_text };
  }
  return { kind: 'item', id_text: body.item_id_text };
}

function listenResponse(result: PopularityListenResult): { status: number; body: object } {
  switch (result) {
    case 'counted':
      return { status: 201, body: { result } };
    case 'updated':
    case 'unchanged':
    case 'daily_cap_reached':
    case 'too_soon':
      return { status: 200, body: { result } };
    case 'below_threshold':
      return {
        status: 400,
        body: {
          message: 'Listen does not meet the counted-listen rule.',
          code: 'listen_below_threshold',
        },
      };
    case 'not_allowed':
      return { status: 403, body: TASTE_PROFILE_CONSENT_REQUIRED_BODY };
    case 'not_found':
      return { status: 404, body: STATS_TARGET_NOT_FOUND_BODY };
    case 'clip_source_removed':
      return { status: 410, body: { message: CLIP_SOURCE_REMOVED_MESSAGE, removed: true } };
  }
}

export class StatsListenController {
  private static statsListenWriteService = new StatsListenWriteService();

  /**
   * Records one report of a listening session. The server's receive time dates the listen; the
   * body carries no device time.
   */
  static async create(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateBodyObject(bodySchema, req, res, async () => {
          const jwtUser = getAuthenticatedUser(req);
          const body: StatsListenBody = req.body;
          const membershipId = jwtUser.account_membership_id;
          const countsTowardPopularity =
            membershipId !== undefined &&
            membershipCountsTowardPopularity(
              membershipId,
              jwtUser.entitlements?.trackStats === true
            );

          try {
            await assertListenStatsAllowed(jwtUser.id);
            const result = await StatsListenController.statsListenWriteService.recordListen({
              account_id: jwtUser.id,
              counts_toward_popularity: countsTowardPopularity,
              agreement_version: config.tasteProfileAgreement.version,
              stored_daily_cap: config.popularityTracking.dailyListenStoredCap,
              popularity_daily_cap: config.popularityTracking.dailyListenPopularityCap,
              min_interval_seconds: config.popularityTracking.listenMinIntervalSeconds,
              all_time_recount_days: config.popularityTracking.allTimeRecountDays,
              flag_too_soon_minutes: config.popularityTracking.flagTooSoonMinutes,
              flag_stored_cap_within_hours: config.popularityTracking.flagStoredCapWithinHours,
              target: listenTarget(body),
              client_listen_id: body.client_listen_id,
              seconds_heard: body.seconds_heard,
              completed: body.completed,
              media_duration_seconds: body.media_duration_seconds ?? null,
            });
            const response = listenResponse(result);
            res.status(response.status).json(response.body);
          } catch (error) {
            if (error instanceof ListenStatsOptedOutError) {
              res.status(403).json(TASTE_PROFILE_CONSENT_REQUIRED_BODY);
              return;
            }
            handleGenericErrorResponse(res, error);
          }
        });
      },
      {
        skipMembershipStatus: false,
        requiredCapability: ACCOUNT_ENTITLEMENT_CAPABILITY.trackStats,
        allowTrialWithoutCapability: true,
      }
    );
  }
}
