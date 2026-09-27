import { loggerService } from '@api/factories/loggerService.js';
import type { NextFunction, Request, Response } from 'express';

import type {
  BillingApiErrorBody,
  BillingApiErrorCode,
  BillingPlatform,
  PaymentProcessorId,
} from '@podverse/helpers';
import {
  BILLING_API_ERROR_CODES,
  BILLING_CLIENT_PLATFORM_HEADER,
  BILLING_CLIENT_VERSION_HEADER,
  compareClientVersion,
  isBillingPlatform,
} from '@podverse/helpers';

import { getCheckoutChannel } from './checkoutOptions.js';

export function sendBillingError(
  res: Response,
  status: number,
  code: BillingApiErrorCode,
  message: string,
  extra?: Pick<BillingApiErrorBody, 'min_client_version'>
): void {
  const body: BillingApiErrorBody = { message, code, i18nKey: code, ...extra };
  res.status(status).json(body);
}

/** The platform header when it names a billing platform, otherwise `fallback`. */
export function resolveClientPlatform(req: Request, fallback: BillingPlatform): BillingPlatform {
  const header = req.get(BILLING_CLIENT_PLATFORM_HEADER)?.trim().toLowerCase() ?? '';
  return isBillingPlatform(header) ? header : fallback;
}

/**
 * Answers 426 when the installed app is older than the channel's `min_client_version`, so a build
 * with a purchase bug can be cut off without a server release. Web ships with the API and has no
 * floor. A floor that is not a dotted version is logged and ignored rather than blocking sales.
 */
export function requireSupportedClientVersion(
  processorId: PaymentProcessorId,
  defaultPlatform: BillingPlatform
) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const platform = resolveClientPlatform(req, defaultPlatform);
    if (platform === 'web') {
      next();
      return;
    }
    const channel = await getCheckoutChannel(processorId, platform);
    const minClientVersion = channel?.min_client_version ?? null;
    if (minClientVersion === null || minClientVersion.trim() === '') {
      next();
      return;
    }

    let comparison: -1 | 0 | 1;
    try {
      comparison = compareClientVersion(req.get(BILLING_CLIENT_VERSION_HEADER), minClientVersion);
    } catch (error) {
      loggerService.logError(
        `Ignoring invalid min_client_version for ${processorId}/${platform}`,
        error instanceof Error ? error : new Error(String(error))
      );
      next();
      return;
    }

    if (comparison < 0) {
      sendBillingError(
        res,
        426,
        BILLING_API_ERROR_CODES.clientUpdateRequired,
        'Update the app to make purchases',
        { min_client_version: minClientVersion }
      );
      return;
    }
    next();
  };
}
