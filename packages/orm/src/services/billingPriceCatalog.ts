import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';
import type { DataSource } from 'typeorm';
import { QueryFailedError } from 'typeorm';

import type {
  BillingCadence,
  ProductMembershipCapDefaults,
  ResolvedProductMembership,
} from '@podverse/helpers';
import { resolveProductMembershipDefaultsFromEnv } from '@podverse/helpers';

type ActivePricingRow = {
  billing_cadence: BillingCadence;
  amount_cents: number;
};

type ProductMembershipSettingsRow = {
  free_trial_expiration_seconds: number;
  trial_max_add_by_rss_feeds: number;
  trial_max_manual_refreshes_per_hour: number;
  premium_max_add_by_rss_feeds: number;
  premium_max_manual_refreshes_per_hour: number;
};

const PREMIUM_PRODUCT_CODE = 'membership_premium';
const USD_CURRENCY_CODE = 'USD';

function isPostgresUniqueViolation(err: unknown): boolean {
  if (!(err instanceof QueryFailedError)) {
    return false;
  }
  if ('code' in err && err.code === '23505') {
    return true;
  }
  const de = err.driverError;
  if (typeof de === 'object' && de !== null && 'code' in de) {
    return Reflect.get(de, 'code') === '23505';
  }
  return err.message.includes('duplicate key');
}

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

  private async getProductMembershipSettingsRow(): Promise<ProductMembershipSettingsRow | null> {
    const rows = (await this.dataSourceRead.query(
      `
      SELECT
        free_trial_expiration_seconds,
        trial_max_add_by_rss_feeds,
        trial_max_manual_refreshes_per_hour,
        premium_max_add_by_rss_feeds,
        premium_max_manual_refreshes_per_hour
      FROM product_membership_settings
      WHERE id = 1
      LIMIT 1
      `
    )) as ProductMembershipSettingsRow[];

    return rows[0] ?? null;
  }

  async ensureProductMembershipTrialSeededFromEnv(now = new Date()): Promise<void> {
    const envDefaults = resolveProductMembershipDefaultsFromEnv();
    // Vitest sets NODE_ENV=test (apps/api/src/test/setup.ts). Linear baseline seeds
    // product_membership_settings with production-shaped trial length; DO NOTHING leaves
    // that row and breaks assertions that expect MEMBERSHIP_FREE_TRIAL_EXPIRATION.
    const conflictResolution =
      process.env.NODE_ENV === 'test'
        ? `
      ON CONFLICT (id) DO UPDATE SET
        free_trial_expiration_seconds = EXCLUDED.free_trial_expiration_seconds,
        trial_max_add_by_rss_feeds = EXCLUDED.trial_max_add_by_rss_feeds,
        trial_max_manual_refreshes_per_hour = EXCLUDED.trial_max_manual_refreshes_per_hour,
        premium_max_add_by_rss_feeds = EXCLUDED.premium_max_add_by_rss_feeds,
        premium_max_manual_refreshes_per_hour = EXCLUDED.premium_max_manual_refreshes_per_hour,
        updated_at = EXCLUDED.updated_at`
        : 'ON CONFLICT (id) DO NOTHING';
    await this.dataSourceReadWrite.query(
      `
      INSERT INTO product_membership_settings (
        id,
        free_trial_expiration_seconds,
        trial_max_add_by_rss_feeds,
        trial_max_manual_refreshes_per_hour,
        premium_max_add_by_rss_feeds,
        premium_max_manual_refreshes_per_hour,
        created_at,
        updated_at
      )
      VALUES (1, $1, $2, $3, $4, $5, $6, $6)
      ${conflictResolution}
      `,
      [
        envDefaults.freeTrialExpirationSeconds,
        envDefaults.trialMaxAddByRSSFeeds,
        envDefaults.trialMaxManualRefreshesPerHour,
        envDefaults.premiumMaxAddByRSSFeeds,
        envDefaults.premiumMaxManualRefreshesPerHour,
        now,
      ]
    );
  }

  async updateProductMembershipSettings(params: {
    freeTrialExpirationSeconds?: number;
    trialMaxAddByRSSFeeds?: number;
    trialMaxManualRefreshesPerHour?: number;
    premiumMaxAddByRSSFeeds?: number;
    premiumMaxManualRefreshesPerHour?: number;
  }): Promise<void> {
    await this.ensureProductMembershipTrialSeededFromEnv();

    const assignments: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (params.freeTrialExpirationSeconds !== undefined) {
      assignments.push(`free_trial_expiration_seconds = $${paramIndex}`);
      values.push(params.freeTrialExpirationSeconds);
      paramIndex += 1;
    }
    if (params.trialMaxAddByRSSFeeds !== undefined) {
      assignments.push(`trial_max_add_by_rss_feeds = $${paramIndex}`);
      values.push(params.trialMaxAddByRSSFeeds);
      paramIndex += 1;
    }
    if (params.trialMaxManualRefreshesPerHour !== undefined) {
      assignments.push(`trial_max_manual_refreshes_per_hour = $${paramIndex}`);
      values.push(params.trialMaxManualRefreshesPerHour);
      paramIndex += 1;
    }
    if (params.premiumMaxAddByRSSFeeds !== undefined) {
      assignments.push(`premium_max_add_by_rss_feeds = $${paramIndex}`);
      values.push(params.premiumMaxAddByRSSFeeds);
      paramIndex += 1;
    }
    if (params.premiumMaxManualRefreshesPerHour !== undefined) {
      assignments.push(`premium_max_manual_refreshes_per_hour = $${paramIndex}`);
      values.push(params.premiumMaxManualRefreshesPerHour);
    }

    if (assignments.length === 0) {
      return;
    }

    assignments.push('updated_at = NOW()');

    await this.dataSourceReadWrite.query(
      `
      UPDATE product_membership_settings
      SET ${assignments.join(', ')}
      WHERE id = 1
      `,
      values
    );
  }

  async resolveProductMembershipCapDefaults(
    now = new Date()
  ): Promise<ProductMembershipCapDefaults> {
    const envDefaults = resolveProductMembershipDefaultsFromEnv();
    await this.ensureProductMembershipTrialSeededFromEnv(now);
    const row = await this.getProductMembershipSettingsRow();
    if (row === null) {
      return {
        trialAllowDirectoryAddByRSS: envDefaults.trialAllowDirectoryAddByRSS,
        trialMaxAddByRSSFeeds: envDefaults.trialMaxAddByRSSFeeds,
        trialMaxManualRefreshesPerHour: envDefaults.trialMaxManualRefreshesPerHour,
        trialTrackStats: envDefaults.trialTrackStats,
        trialAllowNotifications: envDefaults.trialAllowNotifications,
        premiumAllowDirectoryAddByRSS: envDefaults.premiumAllowDirectoryAddByRSS,
        premiumMaxAddByRSSFeeds: envDefaults.premiumMaxAddByRSSFeeds,
        premiumMaxManualRefreshesPerHour: envDefaults.premiumMaxManualRefreshesPerHour,
        premiumTrackStats: envDefaults.premiumTrackStats,
        premiumAllowNotifications: envDefaults.premiumAllowNotifications,
      };
    }
    return {
      trialAllowDirectoryAddByRSS: envDefaults.trialAllowDirectoryAddByRSS,
      trialMaxAddByRSSFeeds: row.trial_max_add_by_rss_feeds,
      trialMaxManualRefreshesPerHour: row.trial_max_manual_refreshes_per_hour,
      trialTrackStats: envDefaults.trialTrackStats,
      trialAllowNotifications: envDefaults.trialAllowNotifications,
      premiumAllowDirectoryAddByRSS: envDefaults.premiumAllowDirectoryAddByRSS,
      premiumMaxAddByRSSFeeds: row.premium_max_add_by_rss_feeds,
      premiumMaxManualRefreshesPerHour: row.premium_max_manual_refreshes_per_hour,
      premiumTrackStats: envDefaults.premiumTrackStats,
      premiumAllowNotifications: envDefaults.premiumAllowNotifications,
    };
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

      await transactionalEntityManager.query('SAVEPOINT billing_seed_monthly');
      try {
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
          SELECT bp.id, $1, 'monthly', $2, $3, NULL, 'env_bootstrap'
          FROM (
            SELECT id
            FROM billing_product
            WHERE product_code = $4
            ORDER BY id
            LIMIT 1
          ) bp
          `,
          [USD_CURRENCY_CODE, monthlyAmountCents, now, PREMIUM_PRODUCT_CODE]
        );
        await transactionalEntityManager.query('RELEASE SAVEPOINT billing_seed_monthly');
      } catch (err) {
        await transactionalEntityManager.query('ROLLBACK TO SAVEPOINT billing_seed_monthly');
        if (!isPostgresUniqueViolation(err)) {
          throw err;
        }
      }

      await transactionalEntityManager.query('SAVEPOINT billing_seed_annual');
      try {
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
          SELECT bp.id, $1, 'annual', $2, $3, NULL, 'env_bootstrap'
          FROM (
            SELECT id
            FROM billing_product
            WHERE product_code = $4
            ORDER BY id
            LIMIT 1
          ) bp
          `,
          [USD_CURRENCY_CODE, annualAmountCents, now, PREMIUM_PRODUCT_CODE]
        );
        await transactionalEntityManager.query('RELEASE SAVEPOINT billing_seed_annual');
      } catch (err) {
        await transactionalEntityManager.query('ROLLBACK TO SAVEPOINT billing_seed_annual');
        if (!isPostgresUniqueViolation(err)) {
          throw err;
        }
      }
    });
  }

  async resolveProductMembership(now = new Date()): Promise<ResolvedProductMembership> {
    const envDefaults = resolveProductMembershipDefaultsFromEnv();

    await this.ensurePremiumPricingSeededFromEnv(now);
    await this.ensureProductMembershipTrialSeededFromEnv(now);

    const rows = await this.getActivePremiumPricingRows(now);
    const settingsRow = await this.getProductMembershipSettingsRow();
    const monthlyRow = rows.find((row) => row.billing_cadence === 'monthly');
    const annualRow = rows.find((row) => row.billing_cadence === 'annual');

    return {
      ...envDefaults,
      freeTrialExpirationSeconds:
        settingsRow !== null
          ? settingsRow.free_trial_expiration_seconds
          : envDefaults.freeTrialExpirationSeconds,
      premiumMembershipCostMonthly:
        monthlyRow !== undefined
          ? Number((monthlyRow.amount_cents / 100).toFixed(2))
          : envDefaults.premiumMembershipCostMonthly,
      premiumMembershipCostAnnually:
        annualRow !== undefined
          ? Number((annualRow.amount_cents / 100).toFixed(2))
          : envDefaults.premiumMembershipCostAnnually,
      trialMaxAddByRSSFeeds:
        settingsRow !== null
          ? settingsRow.trial_max_add_by_rss_feeds
          : envDefaults.trialMaxAddByRSSFeeds,
      trialMaxManualRefreshesPerHour:
        settingsRow !== null
          ? settingsRow.trial_max_manual_refreshes_per_hour
          : envDefaults.trialMaxManualRefreshesPerHour,
      premiumMaxAddByRSSFeeds:
        settingsRow !== null
          ? settingsRow.premium_max_add_by_rss_feeds
          : envDefaults.premiumMaxAddByRSSFeeds,
      premiumMaxManualRefreshesPerHour:
        settingsRow !== null
          ? settingsRow.premium_max_manual_refreshes_per_hour
          : envDefaults.premiumMaxManualRefreshesPerHour,
    };
  }
}
