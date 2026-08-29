import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import {
  accountNotificationPreferenceToJson,
  accountNotificationToJson,
} from '@api/lib/accountNotificationApiSerialization.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { validateBodyObject, validateQueryObject } from '@api/lib/validation/index.js';
import type { Request, Response } from 'express';
import Joi from 'joi';

import type { NotificationCategoryValues } from '@podverse/helpers';
import { ACCOUNT_ENTITLEMENT_CAPABILITY, NOTIFICATION_CATEGORY_VALUES } from '@podverse/helpers';
import {
  AccountNotificationPreferenceService,
  AccountNotificationService,
  AccountService,
} from '@podverse/orm';

const NOTIFICATIONS_DEFAULT_LIMIT = 20;
const NOTIFICATIONS_MAX_LIMIT = 50;

type UpdateNotificationPreferenceInput = {
  category: NotificationCategoryValues;
  in_app_enabled: boolean;
  push_enabled: boolean;
};

const notificationPreferenceSchema = Joi.object({
  category: Joi.string()
    .valid(...NOTIFICATION_CATEGORY_VALUES)
    .required(),
  in_app_enabled: Joi.boolean().required(),
  push_enabled: Joi.boolean().required(),
});

/**
 * Notifications are **read/unread**; channel content is **seen/unseen**. Both indicators are
 * timestamps a badge counts against, so they use different verbs on purpose — a field or a log line
 * naming one is never ambiguous about which badge it belongs to.
 */
export class AccountNotificationController {
  private static accountService = new AccountService();
  private static accountNotificationService = new AccountNotificationService();
  private static accountNotificationPreferenceService = new AccountNotificationPreferenceService();

  static async getNotifications(req: Request, res: Response): Promise<void> {
    const querySchema = Joi.object({
      page: Joi.number().integer().min(1).default(1),
      limit: Joi.number()
        .integer()
        .min(1)
        .max(NOTIFICATIONS_MAX_LIMIT)
        .default(NOTIFICATIONS_DEFAULT_LIMIT),
    });

    validateQueryObject(querySchema, req, res, async () => {
      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;
            const page = Number(req.query.page ?? 1);
            const limit = Number(req.query.limit ?? NOTIFICATIONS_DEFAULT_LIMIT);
            const offset = (page - 1) * limit;

            const account = await AccountNotificationController.accountService.get(account_id);
            if (!account) {
              res.status(404).json({ message: 'Account not found' });
              return;
            }

            const lastReadAt = account.notifications_last_read_at ?? null;
            const notifications =
              await AccountNotificationController.accountNotificationService.listPaginatedForAccount(
                account_id,
                {
                  limit,
                  offset,
                }
              );
            const totalCount =
              await AccountNotificationController.accountNotificationService.countUnread(
                account_id,
                null
              );
            const unreadCount =
              await AccountNotificationController.accountNotificationService.countUnread(
                account_id,
                lastReadAt
              );
            const totalPages = totalCount === 0 ? 0 : Math.ceil(totalCount / limit);

            res.json({
              data: {
                items: notifications.map((notification) =>
                  accountNotificationToJson(notification, lastReadAt)
                ),
                last_read_at: lastReadAt?.toISOString() ?? null,
                pagination: {
                  page,
                  total_count: totalCount,
                  total_pages: totalPages,
                },
                sections: {
                  unread_count: unreadCount,
                },
              },
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        { skipMembershipStatus: true }
      );
    });
  }

  static async getUnreadCount(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const jwtUser = getAuthenticatedUser(req);
          const account_id = jwtUser.id;
          const account = await AccountNotificationController.accountService.get(account_id);
          if (!account) {
            res.status(404).json({ message: 'Account not found' });
            return;
          }
          const lastReadAt = account.notifications_last_read_at ?? null;
          const unreadCount =
            await AccountNotificationController.accountNotificationService.countUnread(
              account_id,
              lastReadAt
            );

          res.json({
            data: {
              unread_count: unreadCount,
            },
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      { skipMembershipStatus: true }
    );
  }

  /**
   * Marks the whole inbox read by moving one timestamp, rather than writing a row per notification.
   * Nothing published before that moment can become unread again, so there is no per-row state to
   * keep and the cost does not grow with how much the account has received.
   */
  static async markRead(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const jwtUser = getAuthenticatedUser(req);
          const account_id = jwtUser.id;
          const lastReadAt =
            await AccountNotificationController.accountService.updateNotificationsLastReadAt(
              account_id,
              new Date()
            );

          res.json({
            data: {
              last_read_at: lastReadAt.toISOString(),
            },
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      { skipMembershipStatus: true }
    );
  }

  static async getPreferences(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const jwtUser = getAuthenticatedUser(req);
          const account_id = jwtUser.id;
          const preferences =
            await AccountNotificationController.accountNotificationPreferenceService.seedDefaultsForAccount(
              account_id
            );

          res.json({
            data: preferences.map(accountNotificationPreferenceToJson),
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      { skipMembershipStatus: true }
    );
  }

  static async updatePreferences(req: Request, res: Response): Promise<void> {
    const bodySchema = Joi.object({
      preferences: Joi.array().items(notificationPreferenceSchema).min(1).required(),
    });

    validateBodyObject(bodySchema, req, res, async () => {
      const { preferences } = req.body as { preferences: UpdateNotificationPreferenceInput[] };
      const requiresNotificationsCapability = preferences.some(
        (preference) => preference.push_enabled === true
      );

      ensureAuthenticated(
        req,
        res,
        async () => {
          try {
            const jwtUser = getAuthenticatedUser(req);
            const account_id = jwtUser.id;

            for (const preference of preferences) {
              const shouldForceInAppEnabled =
                preference.category === 'maintenance' ||
                preference.category === 'terms-of-service' ||
                preference.category === 'general';

              const inAppEnabled = shouldForceInAppEnabled ? true : preference.in_app_enabled;
              await AccountNotificationController.accountNotificationPreferenceService.upsert({
                account_id,
                category: preference.category,
                in_app_enabled: inAppEnabled,
                push_enabled: preference.push_enabled,
              });
            }

            const updatedPreferences =
              await AccountNotificationController.accountNotificationPreferenceService.getForAccount(
                account_id
              );
            res.json({
              data: updatedPreferences.map(accountNotificationPreferenceToJson),
            });
          } catch (error) {
            handleGenericErrorResponse(res, error);
          }
        },
        {
          skipMembershipStatus: !requiresNotificationsCapability,
          requiredCapability: requiresNotificationsCapability
            ? ACCOUNT_ENTITLEMENT_CAPABILITY.allowNotifications
            : undefined,
        }
      );
    });
  }
}
