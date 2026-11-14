import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { joiFeedUrl, validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { DTOAddByRSSConvertResponse } from '@podverse/helpers';
import { AccountAddByRSSDirectoryConversionService } from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';

function isConvertBody(value: unknown): value is { feed_url: string; feed_guid: string | null } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const feedUrl = Reflect.get(value, 'feed_url');
  const feedGuid = Reflect.get(value, 'feed_guid');
  return typeof feedUrl === 'string' && (feedGuid === null || typeof feedGuid === 'string');
}

class AccountAddByRSSConvertController {
  private static conversionService = new AccountAddByRSSDirectoryConversionService();

  static async convert(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          feed_url: joiFeedUrl().max(2048),
          feed_guid: Joi.string().max(255).allow(null).default(null),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          if (!isConvertBody(req.body)) {
            res.status(400).json({ message: '"feed_url" must be a valid uri' });
            return;
          }
          const account = getAuthenticatedUser(req);
          try {
            const result: DTOAddByRSSConvertResponse =
              await AccountAddByRSSConvertController.conversionService.convert({
                accountId: account.id,
                feedUrl: req.body.feed_url,
                feedGuid: req.body.feed_guid,
              });
            res.status(200).json(result);
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      {
        skipMembershipStatus: true,
        apiKeyAccess: { resource: 'subscriptions', action: 'create' },
      }
    );
  }
}

export { AccountAddByRSSConvertController };
