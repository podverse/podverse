import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { localeBodySchema, validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import { AccountWebPushDeviceService } from '@podverse/orm';

export class AccountWebPushDeviceController {
  private static accountWebPushDeviceService = new AccountWebPushDeviceService();

  static async create(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          endpoint: Joi.string().uri().required(),
          p256dh: Joi.string().required(),
          auth: Joi.string().required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { endpoint, p256dh, auth } = req.body as {
              endpoint: string;
              p256dh: string;
              auth: string;
            };
            const accountWebPushDevice =
              await AccountWebPushDeviceController.accountWebPushDeviceService.create(jwtUser.id, {
                endpoint,
                p256dh,
                auth,
              });
            res.json(accountWebPushDevice);
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        });
      },
      { skipMembershipStatus: false }
    );
  }

  static async update(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          endpoint: Joi.string().uri().required(),
          p256dh: Joi.string().required(),
          auth: Joi.string().required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { endpoint, p256dh, auth } = req.body as {
              endpoint: string;
              p256dh: string;
              auth: string;
            };
            const accountWebPushDevice =
              await AccountWebPushDeviceController.accountWebPushDeviceService.update(jwtUser.id, {
                endpoint,
                p256dh,
                auth,
              });
            res.json(accountWebPushDevice);
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        });
      },
      { skipMembershipStatus: false }
    );
  }

  static async delete(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          endpoint: Joi.string().uri().required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { endpoint } = req.body as {
              endpoint: string;
            };
            await AccountWebPushDeviceController.accountWebPushDeviceService.delete(jwtUser.id, {
              endpoint,
            });
            res.json({ message: 'WebPush device deleted successfully' });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        });
      },
      { skipMembershipStatus: true }
    );
  }

  static async getAllForAccount(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const jwtUser = getAuthenticatedUser(req);
          const devices =
            await AccountWebPushDeviceController.accountWebPushDeviceService.getAllForAccount(
              jwtUser.id
            );
          res.json(devices);
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      { skipMembershipStatus: true }
    );
  }

  static async updateLocaleForAccount(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        validateBodyObject(Joi.object(localeBodySchema), req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { locale } = req.body as { locale: string };
            await AccountWebPushDeviceController.accountWebPushDeviceService.updateLocaleForAccount(
              jwtUser.id,
              { locale }
            );
            res.json({ message: 'Locale updated for account devices' });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        });
      },
      { skipMembershipStatus: true }
    );
  }
}
