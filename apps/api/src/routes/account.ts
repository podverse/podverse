import { config } from '@api/config/index.js';
import { AccountController } from '@api/controllers/account/account.js';
import { AccountAddByRSSChaptersTranscriptController } from '@api/controllers/account/accountAddByRSSChaptersTranscript.js';
import { AccountAddByRSSParseController } from '@api/controllers/account/accountAddByRSSParse.js';
import { AccountFCMDeviceController } from '@api/controllers/account/accountFCMDevice.js';
import { AccountFollowingAccountController } from '@api/controllers/account/accountFollowingAccount.js';
import { AccountFollowingAddByRSSChannelController } from '@api/controllers/account/accountFollowingAddByRSSChannel.js';
import { AccountFollowingChannelController } from '@api/controllers/account/accountFollowingChannel.js';
import { AccountFollowingPlaylistController } from '@api/controllers/account/accountFollowingPlaylist.js';
import { AccountNotificationController } from '@api/controllers/account/accountNotification.js';
import { AccountNotificationChannelController } from '@api/controllers/account/accountNotificationChannel.js';
import { AccountNotificationChannelTypeController } from '@api/controllers/account/accountNotificationChannelType.js';
import { AccountOpmlExportController } from '@api/controllers/account/accountOpmlExport.js';
import { AccountOpmlImportController } from '@api/controllers/account/accountOpmlImport.js';
import { AccountUPDeviceController } from '@api/controllers/account/accountUPDevice.js';
import { AccountWebPushDeviceController } from '@api/controllers/account/accountWebPushDevice.js';
import { rateLimitAuthEndpoint, rateLimitEndpoint } from '@api/lib/rateLimiter.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

import { getAccountSignupModeCapabilities } from '@podverse/helpers';

const requireEmailFlows = (_req: Request, res: Response, next: NextFunction): void => {
  const mode = config.premium.signupMode;
  const capabilities = getAccountSignupModeCapabilities(mode);
  if (!capabilities.canUseEmailVerificationFlows) {
    res
      .status(403)
      .json({ message: 'Email verification flows are not available in the current mode' });
    return;
  }
  next();
};

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/account`, router);

router.get('/recent', asyncHandler(AccountController.getManyPublicRecent));
router.get('/top', asyncHandler(AccountController.getManyPublicTop));
router.get('/subscribed/az', asyncHandler(AccountController.getManySubscribedAZ));
router.get('/subscribed/recent', asyncHandler(AccountController.getManySubscribedRecent));
router.get('/subscribed/top', asyncHandler(AccountController.getManySubscribedTop));

router.post(
  '/',
  rateLimitEndpoint(config.rateLimits.accountCreate),
  asyncHandler(AccountController.create)
);
router.post('/accept-terms', asyncHandler(AccountController.acceptTerms));
router.put('/', asyncHandler(AccountController.update));
router.post(
  '/send-verification-email',
  requireEmailFlows,
  rateLimitEndpoint(config.rateLimits.accountSendVerificationEmail),
  asyncHandler(AccountController.sendVerificationEmail)
);
router.post(
  '/verify-email',
  requireEmailFlows,
  rateLimitEndpoint(config.rateLimits.accountVerifyEmail),
  asyncHandler(AccountController.verifyEmail)
);
router.post(
  '/send-change-email-address-email',
  requireEmailFlows,
  rateLimitEndpoint(config.rateLimits.accountSendChangeEmail),
  asyncHandler(AccountController.sendEmailChangeVerificationEmail)
);
router.post(
  '/verify-email-change',
  requireEmailFlows,
  rateLimitEndpoint(config.rateLimits.accountVerifyEmailChange),
  asyncHandler(AccountController.verifyEmailChange)
);
router.post(
  '/send-reset-password-email',
  requireEmailFlows,
  rateLimitEndpoint(config.rateLimits.accountSendResetPasswordEmail),
  asyncHandler(AccountController.sendResetPasswordEmail)
);
router.post(
  '/reset-password',
  requireEmailFlows,
  rateLimitEndpoint(config.rateLimits.accountResetPassword),
  asyncHandler(AccountController.resetPassword)
);
router.post(
  '/set-password',
  rateLimitEndpoint(config.rateLimits.accountSetPassword),
  asyncHandler(AccountController.setPassword)
);
router.delete('/delete', asyncHandler(AccountController.delete));
router.get(
  '/download-data',
  rateLimitAuthEndpoint(config.rateLimits.accountDownloadData),
  asyncHandler(AccountController.downloadData)
);
router.get(
  '/opml/export',
  rateLimitAuthEndpoint(config.rateLimits.accountOpmlExport),
  asyncHandler(AccountOpmlExportController.exportOpml)
);
router.post('/opml/import', asyncHandler(AccountOpmlImportController.enqueueImport));
router.get(
  '/opml/import/status/:request_id',
  asyncHandler(AccountOpmlImportController.getImportStatus)
);

router.post('/fcm-device/create', asyncHandler(AccountFCMDeviceController.create));
router.put('/fcm-device/update', asyncHandler(AccountFCMDeviceController.update));
router.delete('/fcm-device/delete', asyncHandler(AccountFCMDeviceController.delete));
router.get(
  '/fcm-device/all-for-account',
  asyncHandler(AccountFCMDeviceController.getAllForAccount)
);
router.put(
  '/fcm-device/update-locale',
  asyncHandler(AccountFCMDeviceController.updateLocaleForAccount)
);

router.post('/webpush-device/create', asyncHandler(AccountWebPushDeviceController.create));
router.put('/webpush-device/update', asyncHandler(AccountWebPushDeviceController.update));
router.delete('/webpush-device/delete', asyncHandler(AccountWebPushDeviceController.delete));
router.get(
  '/webpush-device/all-for-account',
  asyncHandler(AccountWebPushDeviceController.getAllForAccount)
);
router.put(
  '/webpush-device/update-locale',
  asyncHandler(AccountWebPushDeviceController.updateLocaleForAccount)
);

router.post('/up-device/create', asyncHandler(AccountUPDeviceController.create));
router.put('/up-device/update', asyncHandler(AccountUPDeviceController.update));
router.delete('/up-device/delete', asyncHandler(AccountUPDeviceController.delete));
router.get('/up-device/for-account', asyncHandler(AccountUPDeviceController.getForAccount));
router.put(
  '/up-device/update-locale',
  asyncHandler(AccountUPDeviceController.updateLocaleForAccount)
);
router.delete('/up-device/delete-all', asyncHandler(AccountUPDeviceController.deleteAllForAccount));

router.post('/follow/account', asyncHandler(AccountFollowingAccountController.followAccount));
router.post('/unfollow/account', asyncHandler(AccountFollowingAccountController.unfollowAccount));

router.post(
  '/follow/add-by-rss-channel',
  asyncHandler(AccountFollowingAddByRSSChannelController.addOrUpdateRSSChannel)
);
router.get(
  '/follow/add-by-rss-channel/:account_id_text',
  asyncHandler(AccountFollowingAddByRSSChannelController.getFollowedAddByRSSChannels)
);
router.post(
  '/unfollow/add-by-rss-channel',
  asyncHandler(AccountFollowingAddByRSSChannelController.removeRSSChannel)
);
router.post(
  '/add-by-rss/chapters-transcript',
  rateLimitEndpoint(config.rateLimits.accountAddByRssChaptersTranscript),
  asyncHandler(AccountAddByRSSChaptersTranscriptController.getChaptersAndTranscript)
);
router.post('/add-by-rss/parse', asyncHandler(AccountAddByRSSParseController.enqueueParse));
router.post('/add-by-rss/parse/all', asyncHandler(AccountAddByRSSParseController.enqueueParseAll));
router.get(
  '/add-by-rss/parse/status/:request_id',
  asyncHandler(AccountAddByRSSParseController.getParseStatus)
);

router.post('/follow/channel', asyncHandler(AccountFollowingChannelController.followChannel));
router.post(
  '/follow/channel/bulk',
  asyncHandler(AccountFollowingChannelController.followChannelsBulk)
);
router.post('/unfollow/channel', asyncHandler(AccountFollowingChannelController.unfollowChannel));

router.post('/follow/playlist', asyncHandler(AccountFollowingPlaylistController.followPlaylist));
router.post(
  '/unfollow/playlist',
  asyncHandler(AccountFollowingPlaylistController.unfollowPlaylist)
);

router.get(
  '/notification/channel/:channel_id_text',
  asyncHandler(AccountNotificationChannelController.getByAccountAndChannel)
);
router.get(
  '/notification/channels',
  asyncHandler(AccountNotificationChannelController.getAllByAccount)
);
router.get('/notifications', asyncHandler(AccountNotificationController.getNotifications));
router.get(
  '/notifications/unseen-count',
  asyncHandler(AccountNotificationController.getUnseenCount)
);
router.post('/notifications/mark-seen', asyncHandler(AccountNotificationController.markSeen));
router.get('/notification-preferences', asyncHandler(AccountNotificationController.getPreferences));
router.put(
  '/notification-preferences',
  asyncHandler(AccountNotificationController.updatePreferences)
);
router.post('/notification/channel', asyncHandler(AccountNotificationChannelController.create));
router.delete(
  '/notification/channel/:channel_id_text',
  asyncHandler(AccountNotificationChannelController.delete)
);

router.post(
  '/notification/channel/type',
  asyncHandler(AccountNotificationChannelTypeController.create)
);
router.delete(
  '/notification/channel/:channel_id_text/type/:type',
  asyncHandler(AccountNotificationChannelTypeController.delete)
);

router.get('/:id_text', asyncHandler(AccountController.getByIdText));

export const accountRouter = router;
