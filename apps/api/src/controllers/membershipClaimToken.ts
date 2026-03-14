import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { getParamRequired } from '@api/lib/params.js';
import { tokenBodySchema, validateParamsObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { MembershipClaimTokenService } from '@podverse/orm';

export class MembershipClaimTokenController {
  private membershipClaimTokenService: MembershipClaimTokenService;

  constructor() {
    this.membershipClaimTokenService = new MembershipClaimTokenService();
  }

  async claim(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateParamsObject(Joi.object(tokenBodySchema), req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const token = getParamRequired(req, 'token');
            await this.membershipClaimTokenService.claim(account_id, token);
            res.status(200).json({ message: 'Membership claim token successfully claimed' });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        });
      },
      { skipMembershipStatus: true }
    );
  }
}
