import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { personIdTextParamSchema, validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { followLimitRefusal } from '@podverse/helpers';
import {
  AccountFollowingPersonService,
  FollowLimitReachedError,
  PersonMissingError,
} from '@podverse/orm';

import { handleGenericErrorResponse } from '../helpers/error.js';

class AccountFollowingPersonController {
  private static service = new AccountFollowingPersonService();

  static async followPerson(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateBodyObject(Joi.object(personIdTextParamSchema), req, res, async () => {
          const account = getAuthenticatedUser(req);
          const personIdText = req.body.person_id_text;
          if (typeof personIdText !== 'string') {
            res.status(400).json({ message: 'Validation error' });
            return;
          }
          try {
            await AccountFollowingPersonController.service.followPerson(account.id, personIdText);
            res.status(201).json({ message: 'Successfully followed person' });
          } catch (err) {
            if (err instanceof PersonMissingError) {
              res.status(404).json({ message: 'Person not found' });
              return;
            }
            if (err instanceof FollowLimitReachedError) {
              res.status(403).json(followLimitRefusal(err.limit));
              return;
            }
            handleGenericErrorResponse(res, err);
          }
        });
      },
      {
        skipMembershipStatus: false,
        apiKeyAccess: { resource: 'subscriptions', action: 'create' },
      }
    );
  }

  static async unfollowPerson(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateBodyObject(Joi.object(personIdTextParamSchema), req, res, async () => {
          const account = getAuthenticatedUser(req);
          const personIdText = req.body.person_id_text;
          if (typeof personIdText !== 'string') {
            res.status(400).json({ message: 'Validation error' });
            return;
          }
          try {
            await AccountFollowingPersonController.service.unfollowPerson(account.id, personIdText);
            res.status(204).end();
          } catch (err) {
            handleGenericErrorResponse(res, err);
          }
        });
      },
      {
        skipMembershipStatus: true,
        apiKeyAccess: { resource: 'subscriptions', action: 'delete' },
      }
    );
  }
}

export { AccountFollowingPersonController };
