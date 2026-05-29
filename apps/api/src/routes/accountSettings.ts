import { config } from '@api/config/index.js';
import { AccountSettingsListenStatsController } from '@api/controllers/account/accountSettings/accountSettingsListenStats.js';
import { AccountSettingsLocaleController } from '@api/controllers/account/accountSettings/accountSettingsLocale.js';
import { AccountSettingsNotificationTypeController } from '@api/controllers/account/accountSettings/accountSettingsNotificationType.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import { Router } from 'express';

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/account-settings`, router);

router.patch('/locale', asyncHandler(AccountSettingsLocaleController.update));
router.patch('/listen-stats', asyncHandler(AccountSettingsListenStatsController.update));

router.post('/notification-type', asyncHandler(AccountSettingsNotificationTypeController.create));
router.delete('/notification-type', asyncHandler(AccountSettingsNotificationTypeController.delete));

export const accountSettingsRouter = router;
