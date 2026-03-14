import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { localeBodySchema, validateBodyObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { AccountFCMDevicePlatformValues } from '@podverse/helpers';
import { ACCOUNT_FCM_DEVICE_PLATFORM_VALUES } from '@podverse/helpers';
import { AccountFCMDeviceService } from '@podverse/orm';

export class AccountFCMDeviceController {
  private static accountFCMDeviceService = new AccountFCMDeviceService();

  static async create(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          fcm_token: Joi.string().required(),
          installation_id: Joi.string().required(),
          platform: Joi.string()
            .valid(...ACCOUNT_FCM_DEVICE_PLATFORM_VALUES)
            .required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { fcm_token, installation_id, platform } = req.body as {
              fcm_token: string;
              installation_id: string;
              platform: AccountFCMDevicePlatformValues;
            };
            const accountFCMDevice =
              await AccountFCMDeviceController.accountFCMDeviceService.create(jwtUser.id, {
                fcm_token,
                installation_id,
                platform,
              });
            res.json(accountFCMDevice);
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
          new_fcm_token: Joi.string().required(),
          installation_id: Joi.string().required(),
          previous_fcm_token: Joi.string().required().allow(null),
          platform: Joi.string()
            .valid(...ACCOUNT_FCM_DEVICE_PLATFORM_VALUES)
            .required(),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { previous_fcm_token, new_fcm_token, installation_id, platform } = req.body as {
              new_fcm_token: string;
              installation_id: string;
              previous_fcm_token: string | null;
              platform: AccountFCMDevicePlatformValues;
            };
            const accountFCMDevice =
              await AccountFCMDeviceController.accountFCMDeviceService.update(jwtUser.id, {
                new_fcm_token,
                installation_id,
                previous_fcm_token,
                platform,
              });
            res.json(accountFCMDevice);
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
          fcm_token: Joi.string().required().allow(null),
          installation_id: Joi.string().required().allow(null),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { fcm_token, installation_id } = req.body as {
              fcm_token: string | null;
              installation_id: string | null;
            };
            await AccountFCMDeviceController.accountFCMDeviceService.delete(jwtUser.id, {
              fcm_token: fcm_token ?? null,
              installation_id: installation_id ?? null,
            });
            res.json({ message: 'FCM device deleted successfully' });
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
          const devices = await AccountFCMDeviceController.accountFCMDeviceService.getAllForAccount(
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
            await AccountFCMDeviceController.accountFCMDeviceService.updateLocaleForAccount(
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
