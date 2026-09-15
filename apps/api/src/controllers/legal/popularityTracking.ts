import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import { loadPopularityTrackingMarkdown } from '@api/lib/legal/popularityTrackingContent.js';
import type { Request, Response } from 'express';

import { AccountSettingsLocaleService, getDefaultLocale } from '@podverse/orm';

export class PopularityTrackingLegalController {
  static async get(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const jwtUser = getAuthenticatedUser(req);
          const localeService = new AccountSettingsLocaleService();
          const localeSettings = await localeService.getByAccountId(jwtUser.id);
          const locale = localeSettings?.locale ?? getDefaultLocale();
          const markdown = loadPopularityTrackingMarkdown(locale);

          res.json({
            version: config.popularityTracking.version,
            agreement_date: config.popularityTracking.agreementDate,
            markdown,
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      { skipMembershipStatus: true }
    );
  }
}
