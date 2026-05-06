import { ensureAuthenticated } from '@mgmt-api/lib/auth/index.js';
import { requireCrud } from '@mgmt-api/lib/authz/requireCrud.js';
import { requireSuperuser } from '@mgmt-api/lib/authz/requireSuperuser.js';
import { AuditLogService } from '@mgmt-api/lib/database/auditLog.js';
import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@mgmt-api/orm/db/appDb.js';
import { updateProductMembershipTrialBodySchema } from '@mgmt-api/schemas/productMembership.js';
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
      const { error, value } = updateProductMembershipTrialBodySchema.validate(req.body, {
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
      if (!('freeTrialExpirationSeconds' in value)) {
        res.status(400).json({ message: 'Invalid body' });
        return;
      }
      const freeTrialExpirationSeconds = value.freeTrialExpirationSeconds;
      if (
        typeof freeTrialExpirationSeconds !== 'number' ||
        !Number.isFinite(freeTrialExpirationSeconds)
      ) {
        res.status(400).json({ message: 'Invalid body' });
        return;
      }

      await billingPriceCatalogService.updateProductMembershipTrial({
        freeTrialExpirationSeconds,
      });

      await auditLog.record({
        adminAccountId: adminId,
        operation: 'update',
        tableName: 'product_membership_settings',
        rowId: 1,
        requestId: getRequestId(req),
        afterSnapshot: {
          free_trial_expiration_seconds: freeTrialExpirationSeconds,
        },
      });

      const resolved = await billingPriceCatalogService.resolveProductMembership();
      res.json({ data: resolved });
    } catch (error) {
      next(error);
    }
  }
);
