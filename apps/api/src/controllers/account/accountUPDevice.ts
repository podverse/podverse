import { Request, Response } from 'express';
import Joi from 'joi';
import { AccountUPDeviceService } from '@podverse/orm';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error';
import { localeBodySchema, validateBodyObject } from '@api/lib/validation';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth';

export class AccountUPDeviceController {
  private static accountUPDeviceService = new AccountUPDeviceService();

  static async create(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        const bodySchema = Joi.object({
          up_endpoint: Joi.string().uri().required(),
          up_auth_key: Joi.string().required().allow(null),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { up_endpoint, up_auth_key } = req.body as {
              up_endpoint: string;
              up_auth_key: string | null;
            };
            const accountUPDevice = await AccountUPDeviceController.accountUPDeviceService.create(
              jwtUser.id,
              {
                up_endpoint,
                up_auth_key,
              }
            );
            res.json(accountUPDevice);
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
          up_endpoint: Joi.string().uri().required(),
          up_auth_key: Joi.string().required().allow(null),
        });

        validateBodyObject(bodySchema, req, res, async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const { up_endpoint, up_auth_key } = req.body as {
              up_endpoint: string;
              up_auth_key: string | null;
            };
            const accountUPDevice = await AccountUPDeviceController.accountUPDeviceService.update(
              jwtUser.id,
              {
                up_endpoint,
                up_auth_key,
              }
            );
            res.json(accountUPDevice);
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
        try {
          const jwtUser = getAuthenticatedUser(req);
          await AccountUPDeviceController.accountUPDeviceService.delete(jwtUser.id);
          res.json({ message: 'UP device deleted successfully' });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      { skipMembershipStatus: true }
    );
  }

  static async getForAccount(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const jwtUser = getAuthenticatedUser(req);
          const device = await AccountUPDeviceController.accountUPDeviceService.getForAccount(
            jwtUser.id
          );
          res.json(device);
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
            await AccountUPDeviceController.accountUPDeviceService.updateLocaleForAccount(
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

  static async deleteAllForAccount(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const jwtUser = getAuthenticatedUser(req);
          await AccountUPDeviceController.accountUPDeviceService.deleteAllForAccount(jwtUser.id);
          res.json({ message: 'All UP devices deleted successfully' });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      { skipMembershipStatus: true }
    );
  }
}
