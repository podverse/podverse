import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import type { DataSource } from 'typeorm';

import type { BillingCadence, ResolvedProductMembership } from '@podverse/helpers';
import { resolveProductMembershipDefaultsFromEnv } from '@podverse/helpers';

type ActivePricingRow = {
  billing_cadence: BillingCadence;
  amount_cents: number;
};

type ProductMembershipTrialRow = {
  free_trial_expiration_seconds: number;
};

const PREMIUM_PRODUCT_CODE = 'membership_premium';
const USD_CURRENCY_CODE = 'USD';

export class BillingPriceCatalogService {
  private dataSourceRead: DataSource;
  private dataSourceReadWrite: DataSource;

  constructor(params?: { dataSourceRead?: DataSource; dataSourceReadWrite?: DataSource }) {
    this.dataSourceRead = params?.dataSourceRead ?? getDataSourceRead();
    this.dataSourceReadWrite = params?.dataSourceReadWrite ?? getDataSourceReadWrite();
  }

  private async getActivePremiumPricingRows(now: Date): Promise<ActivePricingRow[]> {
    const rows = await this.dataSourceRead.query(
      `
      SELECT DISTINCT ON (p.billing_cadence)
        p.billing_cadence,
        p.amount_cents
      FROM billing_price p
      INNER JOIN billing_product bp
        ON bp.id = p.billing_product_id
      WHERE bp.product_code = $1
        AND bp.is_active = TRUE
        AND p.currency_code = $2
        AND p.effective_from <= $3
        AND (p.effective_to IS NULL OR p.effective_to > $3)
      ORDER BY p.billing_cadence, p.effective_from DESC
      `,
      [PREMIUM_PRODUCT_CODE, USD_CURRENCY_CODE, now]
    );

    return rows as ActivePricingRow[];
  }

  private async getProductMembershipTrialRow(): Promise<ProductMembershipTrialRow | null> {
    const rows = (await this.dataSourceRead.query(
      `
      SELECT free_trial_expiration_seconds
      FROM product_membership_settings
      WHERE id = 1
      LIMIT 1
      `
    )) as ProductMembershipTrialRow[];

    return rows[0] ?? null;
  }

  async ensureProductMembershipTrialSeededFromEnv(now = new Date()): Promise<void> {
    const envDefaults = resolveProductMembershipDefaultsFromEnv();
    await this.dataSourceReadWrite.query(
      `
      INSERT INTO product_membership_settings (
        id,
        free_trial_expiration_seconds,
        created_at,
        updated_at
      )
      VALUES (1, $1, $2, $2)
      ON CONFLICT (id) DO NOTHING
      `,
      [envDefaults.freeTrialExpirationSeconds, now]
    );
  }

  async updateProductMembershipTrial(params: {
    freeTrialExpirationSeconds: number;
  }): Promise<void> {
    await this.dataSourceReadWrite.query(
      `
      INSERT INTO product_membership_settings (
        id,
        free_trial_expiration_seconds,
        created_at,
        updated_at
      )
      VALUES (1, $1, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE
      SET
        free_trial_expiration_seconds = EXCLUDED.free_trial_expiration_seconds,
        updated_at = NOW()
      `,
      [params.freeTrialExpirationSeconds]
    );
  }

  async ensurePremiumPricingSeededFromEnv(now = new Date()): Promise<void> {
    const envDefaults = resolveProductMembershipDefaultsFromEnv();
    const monthlyAmountCents = Math.round(envDefaults.premiumMembershipCostMonthly * 100);
    const annualAmountCents = Math.round(envDefaults.premiumMembershipCostAnnually * 100);

    await this.dataSourceReadWrite.transaction(async (transactionalEntityManager) => {
      await transactionalEntityManager.query(
        `
        INSERT INTO billing_product (product_code, name, is_active)
        SELECT $1, $2, TRUE
        WHERE NOT EXISTS (
          SELECT 1
          FROM billing_product
          WHERE product_code = $1
        )
        `,
        [PREMIUM_PRODUCT_CODE, 'Premium Membership']
      );

      const rows = (await transactionalEntityManager.query(
        `
        SELECT DISTINCT ON (p.billing_cadence)
          p.billing_cadence,
          p.amount_cents
        FROM billing_price p
        INNER JOIN billing_product bp
          ON bp.id = p.billing_product_id
        WHERE bp.product_code = $1
          AND bp.is_active = TRUE
          AND p.currency_code = $2
          AND p.effective_from <= $3
          AND (p.effective_to IS NULL OR p.effective_to > $3)
        ORDER BY p.billing_cadence, p.effective_from DESC
        `,
        [PREMIUM_PRODUCT_CODE, USD_CURRENCY_CODE, now]
      )) as ActivePricingRow[];

      const hasMonthly = rows.some((row) => row.billing_cadence === 'monthly');
      const hasAnnual = rows.some((row) => row.billing_cadence === 'annual');

      if (!hasMonthly) {
        await transactionalEntityManager.query(
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
          SELECT id, $1, $2, $3, $4, NULL, 'env_bootstrap'
          FROM billing_product
          WHERE product_code = $5
          `,
          [USD_CURRENCY_CODE, 'monthly', monthlyAmountCents, now, PREMIUM_PRODUCT_CODE]
        );
      }

      if (!hasAnnual) {
        await transactionalEntityManager.query(
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
          SELECT id, $1, $2, $3, $4, NULL, 'env_bootstrap'
          FROM billing_product
          WHERE product_code = $5
          `,
          [USD_CURRENCY_CODE, 'annual', annualAmountCents, now, PREMIUM_PRODUCT_CODE]
        );
      }
    });
  }

  async resolveProductMembership(now = new Date()): Promise<ResolvedProductMembership> {
    const envDefaults = resolveProductMembershipDefaultsFromEnv();

    await this.ensurePremiumPricingSeededFromEnv(now);
    await this.ensureProductMembershipTrialSeededFromEnv(now);

    const rows = await this.getActivePremiumPricingRows(now);
    const trialRow = await this.getProductMembershipTrialRow();
    const monthlyRow = rows.find((row) => row.billing_cadence === 'monthly');
    const annualRow = rows.find((row) => row.billing_cadence === 'annual');

    return {
      ...envDefaults,
      freeTrialExpirationSeconds:
        trialRow !== null
          ? trialRow.free_trial_expiration_seconds
          : envDefaults.freeTrialExpirationSeconds,
      premiumMembershipCostMonthly:
        monthlyRow !== undefined
          ? Number((monthlyRow.amount_cents / 100).toFixed(2))
          : envDefaults.premiumMembershipCostMonthly,
      premiumMembershipCostAnnually:
        annualRow !== undefined
          ? Number((annualRow.amount_cents / 100).toFixed(2))
          : envDefaults.premiumMembershipCostAnnually,
    };
  }
}
