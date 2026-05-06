import { ensureAuthenticated } from '@mgmt-api/lib/auth/index.js';
import { requireCrud } from '@mgmt-api/lib/authz/requireCrud.js';
import { AuditLogService } from '@mgmt-api/lib/database/auditLog.js';
import { getParamRequired } from '@mgmt-api/lib/params.js';
import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@mgmt-api/orm/db/appDb.js';
import express from 'express';
import Joi from 'joi';

import type { BillingCadence } from '@podverse/helpers';

const router = express.Router();
const auditLog = new AuditLogService();

const schedulePriceSchema = Joi.object({
  productCode: Joi.string().default('membership_premium'),
  currencyCode: Joi.string().length(3).uppercase().default('USD'),
  cadence: Joi.string().valid('monthly', 'annual').required(),
  amountCents: Joi.number().integer().min(0).required(),
  effectiveFrom: Joi.date().iso().optional(),
  changeReason: Joi.string().max(500).allow('', null).optional(),
}).required();

function getRequestId(req: express.Request): string {
  return req.id ?? req.headers['x-request-id']?.toString() ?? '';
}

type PricingRow = {
  id: number;
  product_code: string;
  currency_code: string;
  billing_cadence: BillingCadence;
  amount_cents: number;
  effective_from: string;
  effective_to: string | null;
  source: string;
};

router.get(
  '/active',
  ensureAuthenticated,
  requireCrud('billing_prices', 'read'),
  async (_req, res, next) => {
    try {
      const rows = (await AppDbDataSourceRead.query(
        `
      SELECT
        p.id,
        bp.product_code,
        p.currency_code,
        p.billing_cadence,
        p.amount_cents,
        p.effective_from,
        p.effective_to,
        p.source
      FROM billing_price p
      INNER JOIN billing_product bp ON bp.id = p.billing_product_id
      WHERE bp.is_active = TRUE
        AND p.effective_from <= NOW()
        AND (p.effective_to IS NULL OR p.effective_to > NOW())
      ORDER BY bp.product_code ASC, p.billing_cadence ASC, p.effective_from DESC
      `
      )) as PricingRow[];
      res.json({ data: rows });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/schedule',
  ensureAuthenticated,
  requireCrud('billing_prices', 'create'),
  async (req, res, next) => {
    try {
      const { error, value } = schedulePriceSchema.validate(req.body);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }

      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const effectiveFrom = value.effectiveFrom ? new Date(value.effectiveFrom) : new Date();
      const result = await AppDbDataSourceReadWrite.transaction(async (tx) => {
        const products = (await tx.query(
          `
          SELECT id, product_code
          FROM billing_product
          WHERE product_code = $1
          LIMIT 1
          `,
          [value.productCode]
        )) as Array<{ id: number; product_code: string }>;
        const product = products[0];
        if (!product) {
          throw new Error('Billing product not found');
        }

        const activeRows = (await tx.query(
          `
          SELECT id, amount_cents, effective_from, effective_to
          FROM billing_price
          WHERE billing_product_id = $1
            AND currency_code = $2
            AND billing_cadence = $3
            AND effective_to IS NULL
          LIMIT 1
          `,
          [product.id, value.currencyCode, value.cadence]
        )) as Array<{
          id: number;
          amount_cents: number;
          effective_from: Date | string;
          effective_to: Date | string | null;
        }>;
        const active = activeRows[0] ?? null;

        if (active !== null) {
          await tx.query(
            `
            UPDATE billing_price
            SET effective_to = $2, updated_at = NOW()
            WHERE id = $1
            `,
            [active.id, effectiveFrom]
          );
        }

        const inserted = (await tx.query(
          `
          INSERT INTO billing_price (
            billing_product_id,
            currency_code,
            billing_cadence,
            amount_cents,
            effective_from,
            effective_to,
            source
          )
          VALUES ($1, $2, $3, $4, $5, NULL, 'management_api')
          RETURNING id
          `,
          [product.id, value.currencyCode, value.cadence, value.amountCents, effectiveFrom]
        )) as Array<{ id: number }>;
        const priceId = inserted[0]?.id;
        if (!priceId) {
          throw new Error('Failed to insert pricing row');
        }

        await tx.query(
          `
          INSERT INTO billing_price_change_audit (
            billing_price_id,
            changed_by_admin_account_id,
            change_reason,
            previous_amount_cents,
            new_amount_cents,
            previous_effective_from,
            previous_effective_to,
            new_effective_from,
            new_effective_to
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULL)
          `,
          [
            priceId,
            adminId,
            value.changeReason ?? null,
            active?.amount_cents ?? null,
            value.amountCents,
            active?.effective_from ?? null,
            active?.effective_to ?? null,
            effectiveFrom,
          ]
        );

        return { priceId };
      });

      await auditLog.record({
        adminAccountId: adminId,
        operation: 'create',
        tableName: 'billing_price',
        rowId: result.priceId,
        requestId: getRequestId(req),
        afterSnapshot: {
          cadence: value.cadence,
          amount_cents: value.amountCents,
          currency_code: value.currencyCode,
          effective_from: effectiveFrom.toISOString(),
        },
      });

      res.status(201).json({ data: { id: result.priceId } });
    } catch (error) {
      if (error instanceof Error && error.message === 'Billing product not found') {
        res.status(404).json({ message: error.message });
        return;
      }
      next(error);
    }
  }
);

router.post(
  '/:id/activate',
  ensureAuthenticated,
  requireCrud('billing_prices', 'update'),
  async (req, res, next) => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      const idParam = getParamRequired(req, 'id');
      const id = parseInt(idParam, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid id' });
        return;
      }

      const rows = (await AppDbDataSourceReadWrite.query(
        `
        SELECT id, billing_product_id, currency_code, billing_cadence
        FROM billing_price
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      )) as Array<{
        id: number;
        billing_product_id: number;
        currency_code: string;
        billing_cadence: BillingCadence;
      }>;
      const target = rows[0];
      if (!target) {
        res.status(404).json({ message: 'Pricing row not found' });
        return;
      }

      await AppDbDataSourceReadWrite.transaction(async (tx) => {
        await tx.query(
          `
          UPDATE billing_price
          SET effective_to = NOW(), updated_at = NOW()
          WHERE billing_product_id = $1
            AND currency_code = $2
            AND billing_cadence = $3
            AND effective_to IS NULL
            AND id <> $4
          `,
          [target.billing_product_id, target.currency_code, target.billing_cadence, target.id]
        );

        await tx.query(
          `
          UPDATE billing_price
          SET effective_to = NULL, updated_at = NOW()
          WHERE id = $1
          `,
          [target.id]
        );
      });

      await auditLog.record({
        adminAccountId: adminId,
        operation: 'update',
        tableName: 'billing_price',
        rowId: target.id,
        requestId: getRequestId(req),
        afterSnapshot: { activated: true },
      });

      res.json({ message: 'Pricing row activated' });
    } catch (error) {
      next(error);
    }
  }
);

router.post(
  '/:id/deprecate',
  ensureAuthenticated,
  requireCrud('billing_prices', 'update'),
  async (req, res, next) => {
    try {
      const adminId = req.user?.id;
      if (!adminId) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }
      const idParam = getParamRequired(req, 'id');
      const id = parseInt(idParam, 10);
      if (isNaN(id)) {
        res.status(400).json({ message: 'Invalid id' });
        return;
      }

      const rows = (await AppDbDataSourceReadWrite.query(
        `
        SELECT id, effective_to
        FROM billing_price
        WHERE id = $1
        LIMIT 1
        `,
        [id]
      )) as Array<{ id: number; effective_to: Date | string | null }>;
      const target = rows[0];
      if (!target) {
        res.status(404).json({ message: 'Pricing row not found' });
        return;
      }

      if (target.effective_to === null) {
        await AppDbDataSourceReadWrite.query(
          `
          UPDATE billing_price
          SET effective_to = NOW(), updated_at = NOW()
          WHERE id = $1
          `,
          [target.id]
        );
      }

      await auditLog.record({
        adminAccountId: adminId,
        operation: 'update',
        tableName: 'billing_price',
        rowId: target.id,
        requestId: getRequestId(req),
        afterSnapshot: { deprecated: true },
      });

      res.json({ message: 'Pricing row deprecated' });
    } catch (error) {
      next(error);
    }
  }
);

export const productPricingRouter = router;
