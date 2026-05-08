import type { DataSource } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import { BillingPriceCatalogService } from './billingPriceCatalog.js';

function createMockDataSource(): DataSource {
  return { query: vi.fn().mockResolvedValue([]) } as unknown as DataSource;
}

describe('BillingPriceCatalogService.updateProductMembershipSettings', () => {
  it('runs INSERT seed then UPDATE when changing trial seconds', async () => {
    const read = createMockDataSource();
    const readWrite = createMockDataSource();
    const service = new BillingPriceCatalogService({
      dataSourceRead: read,
      dataSourceReadWrite: readWrite,
    });

    await service.updateProductMembershipSettings({ freeTrialExpirationSeconds: 120 });

    const calls = (readWrite.query as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) =>
      String(c[0])
    );
    expect(calls.some((sql) => sql.includes('INSERT INTO product_membership_settings'))).toBe(true);
    expect(calls.some((sql) => sql.includes('UPDATE product_membership_settings'))).toBe(true);
    expect(calls.some((sql) => sql.includes('free_trial_expiration_seconds = $1'))).toBe(true);
  });

  it('runs UPDATE with cap column when changing trial RSS cap', async () => {
    const read = createMockDataSource();
    const readWrite = createMockDataSource();
    const service = new BillingPriceCatalogService({
      dataSourceRead: read,
      dataSourceReadWrite: readWrite,
    });

    await service.updateProductMembershipSettings({ trialMaxAddByRSSFeeds: 7 });

    const calls = (readWrite.query as ReturnType<typeof vi.fn>).mock.calls.map((c: unknown[]) =>
      String(c[0])
    );
    expect(calls.some((sql) => sql.includes('trial_max_add_by_rss_feeds = $1'))).toBe(true);
  });
});
