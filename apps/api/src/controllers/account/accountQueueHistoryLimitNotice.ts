import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { QUEUE_HISTORY_LIMIT_CHANGED_CODE } from '@podverse/helpers';
import { acknowledgeQueueHistoryLimitNotice, readQueueHistoryLimitNotice } from '@podverse/orm';

const acknowledgeBodySchema = Joi.object({
  limit: Joi.number().integer().min(1).required(),
});

export class AccountQueueHistoryLimitNoticeController {
  static async get(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const account = getAuthenticatedUser(req);
          const notice = await readQueueHistoryLimitNotice(account.id);
          if (notice === null) {
            res.status(404).json({ message: 'Account membership status not found' });
            return;
          }
          res.status(200).json(notice);
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      {
        skipMembershipStatus: true,
        apiKeyAccess: { resource: 'account', action: 'read' },
      }
    );
  }

  static async acknowledge(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateBodyObject(acknowledgeBodySchema, req, res, async () => {
          try {
            const account = getAuthenticatedUser(req);
            const limit = req.body.limit;
            if (typeof limit !== 'number') {
              res.status(400).json({ message: 'Validation error' });
              return;
            }
            const result = await acknowledgeQueueHistoryLimitNotice(account.id, limit);
            if (result.outcome === 'missing') {
              res.status(404).json({ message: 'Account membership status not found' });
              return;
            }
            if (result.outcome === 'stale') {
              res.status(409).json({
                message: 'Queue history limit changed',
                code: QUEUE_HISTORY_LIMIT_CHANGED_CODE,
                limit: result.limit,
              });
              return;
            }
            res.status(200).json(result.notice);
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        });
      },
      {
        skipMembershipStatus: true,
        apiKeyAccess: { resource: 'account', action: 'update' },
      }
    );
  }
}
