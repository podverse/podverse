import { ensureAuthenticated } from '@mgmt-api/lib/auth/index.js';
import { requireCrud } from '@mgmt-api/lib/authz/requireCrud.js';
import { requireSuperuser } from '@mgmt-api/lib/authz/requireSuperuser.js';
import { AuditLogService } from '@mgmt-api/lib/database/auditLog.js';
import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@mgmt-api/orm/db/appDb.js';
import { updateProductMembershipSettingsBodySchema } from '@mgmt-api/schemas/productMembership.js';
import express from 'express';

import { BillingPriceCatalogService } from '@podverse/orm';

export const productMembershipRouter = express.Router();
const auditLog = new AuditLogService();
const billingPriceCatalogService = new BillingPriceCatalogService({
  dataSourceRead: AppDbDataSourceRead,
  dataSourceReadWrite: AppDbDataSourceReadWrite,
});

function getRequestId(req: express.Request): string {
  return req.id ?? req.headers['x-request-id']?.toString() ?? '';
}

productMembershipRouter.get('/', ensureAuthenticated, requireSuperuser, async (_req, res, next) => {
  try {
    const resolved = await billingPriceCatalogService.resolveProductMembership();
    res.json({ data: resolved });
  } catch (error) {
    next(error);
  }
});

productMembershipRouter.patch(
  '/',
  ensureAuthenticated,
  requireSuperuser,
  requireCrud('billing_prices', 'update'),
  async (req, res, next) => {
    try {
      const { error, value } = updateProductMembershipSettingsBodySchema.validate(req.body, {
        abortEarly: false,
        convert: true,
      });
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }

      const adminId = req.user?.id;
      if (adminId === undefined) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      if (typeof value !== 'object' || value === null) {
        res.status(400).json({ message: 'Invalid body' });
        return;
      }

      const updates: {
        freeTrialExpirationSeconds?: number;
        trialMaxAddByRSSFeeds?: number;
        trialMaxManualRefreshesPerHour?: number;
        premiumMaxAddByRSSFeeds?: number;
        premiumMaxManualRefreshesPerHour?: number;
      } = {};

      if (value.freeTrialExpirationSeconds !== undefined) {
        updates.freeTrialExpirationSeconds = value.freeTrialExpirationSeconds;
      }
      if (value.trialMaxAddByRSSFeeds !== undefined) {
        updates.trialMaxAddByRSSFeeds = value.trialMaxAddByRSSFeeds;
      }
      if (value.trialMaxManualRefreshesPerHour !== undefined) {
        updates.trialMaxManualRefreshesPerHour = value.trialMaxManualRefreshesPerHour;
      }
      if (value.premiumMaxAddByRSSFeeds !== undefined) {
        updates.premiumMaxAddByRSSFeeds = value.premiumMaxAddByRSSFeeds;
      }
      if (value.premiumMaxManualRefreshesPerHour !== undefined) {
        updates.premiumMaxManualRefreshesPerHour = value.premiumMaxManualRefreshesPerHour;
      }

      if (Object.keys(updates).length === 0) {
        res.status(400).json({ message: 'Invalid body' });
        return;
      }

      await billingPriceCatalogService.updateProductMembershipSettings(updates);

      const afterSnapshot: Record<string, unknown> = {};
      if (updates.freeTrialExpirationSeconds !== undefined) {
        afterSnapshot.free_trial_expiration_seconds = updates.freeTrialExpirationSeconds;
      }
      if (updates.trialMaxAddByRSSFeeds !== undefined) {
        afterSnapshot.trial_max_add_by_rss_feeds = updates.trialMaxAddByRSSFeeds;
      }
      if (updates.trialMaxManualRefreshesPerHour !== undefined) {
        afterSnapshot.trial_max_manual_refreshes_per_hour = updates.trialMaxManualRefreshesPerHour;
      }
      if (updates.premiumMaxAddByRSSFeeds !== undefined) {
        afterSnapshot.premium_max_add_by_rss_feeds = updates.premiumMaxAddByRSSFeeds;
      }
      if (updates.premiumMaxManualRefreshesPerHour !== undefined) {
        afterSnapshot.premium_max_manual_refreshes_per_hour =
          updates.premiumMaxManualRefreshesPerHour;
      }

      await auditLog.record({
        adminAccountId: adminId,
        operation: 'update',
        tableName: 'product_membership_settings',
        rowId: 1,
        requestId: getRequestId(req),
        afterSnapshot,
      });

      const resolved = await billingPriceCatalogService.resolveProductMembership();
      res.json({ data: resolved });
    } catch (error) {
      next(error);
    }
  }
);
