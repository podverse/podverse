import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import type { Request, Response } from 'express';

export class MembershipController {
  static async getPricing(_req: Request, res: Response): Promise<void> {
    try {
      if (config.premium.signupMode !== 'user_signup_email') {
        res
          .status(400)
          .json({ message: 'Paid premium memberships are not enabled for this server' });
        return;
      }

      const freeTrialExpiration = config.premium.freeTrialExpiration;
      const freeTrialDays = Math.floor(freeTrialExpiration / 86400);
      const costMonthly = config.premium.costMonthly;
      const costAnnually = config.premium.costAnnually;
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
