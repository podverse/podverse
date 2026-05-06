import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth/index.js';
import type { Request, Response } from 'express';

import { BillingPriceCatalogService } from '@podverse/orm';
import { AccountService } from '@podverse/orm';

const billingPriceCatalogService = new BillingPriceCatalogService();
const accountService = new AccountService();

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

  static async getBillingReadModel(req: Request, res: Response): Promise<void> {
    ensureAuthenticated(
      req,
      res,
      async () => {
        try {
          const jwtUser = getAuthenticatedUser(req);
          const account = await accountService.get(jwtUser.id, {
            relations: [
              'account_membership_status',
              'account_membership_status.account_membership',
            ],
          });
          if (!account || !account.account_membership_status) {
            res.status(404).json({ message: 'Account membership status not found' });
            return;
          }

          const pricing = await billingPriceCatalogService.resolveProductMembership();
          const status = account.account_membership_status;
          const cadence = status.billing_cadence;
          const autoRenewMode = status.auto_renew_mode ?? (status.auto_renew ? 'on' : 'off');

          res.json({
            data: {
              tier: status.account_membership?.tier ?? null,
              membershipExpiresAt: status.membership_expires_at ?? null,
              cadence,
              autoRenewMode,
              autoRenewEnabled: autoRenewMode === 'on',
              renewal: {
                nextAttemptAt: status.next_renewal_attempt_at ?? null,
                lastAttemptAt: status.last_renewal_attempt_at ?? null,
                lastStatus: status.last_renewal_status ?? 'none',
              },
              pricing: {
                currencyCode: 'USD',
                premiumMonthly: pricing.premiumMembershipCostMonthly,
                premiumAnnual: pricing.premiumMembershipCostAnnually,
              },
            },
          });
        } catch (error) {
          handleGenericErrorResponse(res, error);
        }
      },
      { skipMembershipStatus: true }
    );
  }
}
