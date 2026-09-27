import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import type { Request, Response } from 'express';

import { BillingPriceCatalogService } from '@podverse/orm';

const billingPriceCatalogService = new BillingPriceCatalogService();

export class MembershipController {
  /** Public read-only resolved membership product numbers (env + DB + pricing catalog; no NEXT_PUBLIC drift). */
  static async getResolvedProductMembership(_req: Request, res: Response): Promise<void> {
    try {
      const flat = await billingPriceCatalogService.resolveProductMembership();
      const freeTrialExpiration = flat.freeTrialExpirationSeconds;
      const freeTrialDays = Math.floor(freeTrialExpiration / 86400);
      const costMonthly = flat.premiumMembershipCostMonthly;
      const costAnnually = flat.premiumMembershipCostAnnually;
      const monthlyEquivalentAnnually = costMonthly * 12;
      const annuallySavingsPercent =
        monthlyEquivalentAnnually > 0
          ? Math.floor(
              ((monthlyEquivalentAnnually - costAnnually) / monthlyEquivalentAnnually) * 100
            )
          : 0;

      res.json({
        data: {
          ...flat,
          freeTrialDays,
          annuallySavingsPercent,
          monthlyEquivalentAnnually,
        },
      });
    } catch (error) {
      handleGenericErrorResponse(res, error);
    }
  }

  static async getPricing(_req: Request, res: Response): Promise<void> {
    try {
      if (config.premium.signupMode !== 'user_signup_email') {
        res
          .status(400)
          .json({ message: 'Paid premium memberships are not enabled for this server' });
        return;
      }

      const flat = await billingPriceCatalogService.resolveProductMembership();
      const freeTrialExpiration = flat.freeTrialExpirationSeconds;
      const freeTrialDays = Math.floor(freeTrialExpiration / 86400);
      const costMonthly = flat.premiumMembershipCostMonthly;
      const costAnnually = flat.premiumMembershipCostAnnually;
      const monthlyEquivalentAnnually = costMonthly * 12;
      const annuallySavingsPercent = Math.floor(
        ((monthlyEquivalentAnnually - costAnnually) / monthlyEquivalentAnnually) * 100
      );

      const data = {
        costMonthly,
        costAnnually,
        freeTrialExpiration,
        freeTrialDays,
        annuallySavingsPercent,
        monthlyEquivalentAnnually,
      };

      res.json({ data });
    } catch (error) {
      handleGenericErrorResponse(res, error);
    }
  }
}
