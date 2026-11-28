import { config } from '@api/config/index.js';
import { handleGenericErrorResponse } from '@api/controllers/helpers/error.js';
import { buildPublicMembershipCatalog } from '@api/controllers/membership.js';
import { resolveStatsTrackEventRetentionDays } from '@api/lib/legal/termsContent.js';
import type { Request, Response } from 'express';

import type { PublicClientConfig } from '@podverse/helpers';

export class PublicClientConfigController {
  static async get(_req: Request, res: Response): Promise<void> {
    try {
      const data: PublicClientConfig = {
        membership: await buildPublicMembershipCatalog(),
        playlistLimits: {
          maxPerPlaylist: config.playlistTags.maxPerPlaylist,
          nameMaxLength: config.playlistTags.nameMaxLength,
        },
        instance: {
          brandName: config.brandName,
          legalName: config.legal.name,
          contactEmail: config.terms.contactEmail,
          signupMode: config.premium.signupMode,
          secondFactorMode: config.secondFactor.mode(),
          termsVersion: config.terms.version,
          tasteProfileAgreementVersion: config.tasteProfileAgreement.version,
          statsRetentionDays: resolveStatsTrackEventRetentionDays(),
        },
      };
      res.json({ data });
    } catch (error) {
      handleGenericErrorResponse(res, error);
    }
  }
}
