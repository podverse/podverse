import { config } from '@api/config/index.js';
import { BillingController } from '@api/controllers/billing.js';
import { ensureAuthenticated } from '@api/lib/auth/index.js';
import { requireSupportedClientVersion } from '@api/lib/billing/billingHttp.js';
import { rateLimitAuthEndpoint, rateLimitEndpointPerScope } from '@api/lib/rateLimiter.js';
import { asyncHandler } from '@api/middleware/asyncHandler.js';
import type { NextFunction, Request, Response } from 'express';
import { Router } from 'express';

/** Billing must stay reachable for lapsed members, so membership status is not checked. */
const requireAccount = (req: Request, res: Response, next: NextFunction): void => {
  ensureAuthenticated(req, res, next, { skipMembershipStatus: true });
};

/** Status only: reachable while terms acceptance is outstanding (Account Access page). */
const requireAccountSkipTerms = (req: Request, res: Response, next: NextFunction): void => {
  ensureAuthenticated(req, res, next, {
    skipMembershipStatus: true,
    skipTermsAcceptance: true,
  });
};

/** Signs in the caller and limits purchase attempts per account. */
const purchaseRateLimit = rateLimitAuthEndpoint(config.rateLimits.billingPurchase);

const router = Router();

router.use(`${config.api.prefix}${config.api.version}/billing`, router);

router.get('/checkout-options', asyncHandler(BillingController.getCheckoutOptions));
router.get('/status', requireAccountSkipTerms, asyncHandler(BillingController.getStatus));

router.post(
  '/paypal/orders',
  purchaseRateLimit,
  asyncHandler(requireSupportedClientVersion('paypal', 'web')),
  asyncHandler(BillingController.createPayPalOrder)
);
router.post(
  '/paypal/orders/:id/capture',
  purchaseRateLimit,
  asyncHandler(requireSupportedClientVersion('paypal', 'web')),
  asyncHandler(BillingController.capturePayPalOrder)
);
router.post(
  '/apple/transactions',
  purchaseRateLimit,
  asyncHandler(requireSupportedClientVersion('apple', 'ios')),
  asyncHandler(BillingController.postAppleTransaction)
);
router.post(
  '/google/purchases',
  purchaseRateLimit,
  asyncHandler(requireSupportedClientVersion('google_play', 'android')),
  asyncHandler(BillingController.postGooglePurchase)
);
router.post('/restore', purchaseRateLimit, asyncHandler(BillingController.restorePurchases));

/** Webhooks arrive with a raw body (see the parser mounted for this path in `app.ts`). */
router.post(
  '/webhooks/paypal',
  rateLimitEndpointPerScope(config.rateLimits.billingWebhook, 'paypal'),
  asyncHandler(BillingController.receiveWebhook('paypal'))
);
router.post(
  '/webhooks/apple',
  rateLimitEndpointPerScope(config.rateLimits.billingWebhook, 'apple'),
  asyncHandler(BillingController.receiveWebhook('apple'))
);
router.post(
  '/webhooks/google',
  rateLimitEndpointPerScope(config.rateLimits.billingWebhook, 'google_play'),
  asyncHandler(BillingController.receiveWebhook('google_play'))
);

router.post('/test/simulate', requireAccount, asyncHandler(BillingController.simulateTestEvent));

export const billingRouter = router;
