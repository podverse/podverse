import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import {
  BILLING_CLIENT_PLATFORM_HEADER,
  BILLING_CLIENT_VERSION_HEADER,
  extendMembershipPeriodByCadence,
  PAYPAL_ONE_TIME_PRODUCT_IDS,
} from '@podverse/helpers';
import type { ORMContext } from '@podverse/orm';

import { authHeaders, getBaseApiUrl, startTestApp, stopTestApp } from './helpers/index.js';

/** PayPal never leaves the process: signature checks stay in the test. */
vi.mock('@podverse/external-services-paypal', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/external-services-paypal')>();

  class FakePayPalService {
    isSandboxEnvironment(): boolean {
      return true;
    }

    async verifyWebhookSignature(params: { transmissionSig: string }): Promise<boolean> {
      return params.transmissionSig !== 'bad-signature';
    }
  }

  return { ...actual, PayPalService: FakePayPalService };
});

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  return { ...actual, CategoryService: MockCategoryService };
});

const PAYPAL_ENV = {
  BILLING_PAYPAL_ENABLED: 'true',
  PAYPAL_CLIENT_ID: 'vitest-client-id',
  PAYPAL_CLIENT_SECRET: 'vitest-client-secret',
  PAYPAL_WEBHOOK_ID: 'WH-VITEST',
} as const;

const TEST_MONTHLY_PRODUCT_ID = 'vitest_premium_monthly';
const TEST_ANNUAL_PRODUCT_ID = 'vitest_premium_annual';
const TEST_INACTIVE_PRODUCT_ID = 'vitest_premium_inactive';

type TestAccount = {
  id: number;
  headers: { Authorization: string };
  billingCustomerRef: string;
};

describe('Billing routes', () => {
  let app: import('express').Express;
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let base = '';
  const runId = Date.now();
  const savedEnv: Record<string, string | undefined> = {};

  const query = async (sql: string, params: unknown[] = []): Promise<unknown> => {
    if (!ormContext) {
      throw new Error('ORM context not started');
    }
    return ormContext.dataSourceReadWrite.query(sql, params);
  };

  const clearChannelCache = async (): Promise<void> => {
    const { clearBillingChannelCache } = await import('../lib/billing/checkoutOptions.js');
    clearBillingChannelCache();
  };

  let accountCount = 0;
  const createSignedUpAccount = async () => {
    const { AccountService } = await import('@podverse/orm');
    const accountService = new AccountService();
    accountCount += 1;
    const email = `billing-${runId}-${accountCount}@example.com`;
    await accountService.create({ email, password: 'IntegrationTest1!', locale: 'en-US' });
    const account = await accountService.getByEmail(email);
    if (!account) {
      throw new Error('Failed to load account after create');
    }
    return account;
  };

  /** A signed-up account whose free trial has ended, so access comes only from what a test pays. */
  const createAccount = async (): Promise<TestAccount> => {
    const { BillingMembershipExtensionService } = await import('@podverse/orm');
    const account = await createSignedUpAccount();
    await new BillingMembershipExtensionService().endAccess({
      accountId: account.id,
      endsAt: new Date(),
    });
    return {
      id: account.id,
      headers: authHeaders(account.id, account.id_text),
      billingCustomerRef: account.billing_customer_ref,
    };
  };

  const simulate = (account: TestAccount, event: Record<string, unknown>) =>
    request(app).post(`${base}/billing/test/simulate`).set(account.headers).send({ event });

  const payment = (transactionId: string, productId = TEST_MONTHLY_PRODUCT_ID) => ({
    type: 'payment_settled',
    externalTransactionId: transactionId,
    externalProductId: productId,
    externalBasePlanId: null,
    periodStart: null,
    periodEnd: null,
    amount: { value: '3.00', currencyCode: 'USD' },
  });

  const refund = (transactionId: string) => ({
    type: 'refund_or_revoke',
    externalTransactionId: transactionId,
    reason: 'refund',
    revokedAt: new Date().toISOString(),
  });

  const getStatus = async (account: TestAccount) => {
    const res = await request(app).get(`${base}/billing/status`).set(account.headers).expect(200);
    return res.body;
  };

  beforeAll(async () => {
    for (const [key, value] of Object.entries(PAYPAL_ENV)) {
      savedEnv[key] = process.env[key];
      process.env[key] = value;
    }

    const started = await startTestApp();
    app = started.app;
    server = started.server;
    ormContext = started.ormContext;
    base = await getBaseApiUrl();

    const { BillingProcessorProductService } = await import('@podverse/orm');
    const productService = new BillingProcessorProductService();
    await productService.upsertPremiumProcessorProduct({
      processorId: 'test',
      externalProductId: TEST_MONTHLY_PRODUCT_ID,
      externalBasePlanId: null,
      cadence: 'monthly',
    });
    await productService.upsertPremiumProcessorProduct({
      processorId: 'test',
      externalProductId: TEST_ANNUAL_PRODUCT_ID,
      externalBasePlanId: null,
      cadence: 'annual',
    });
    await productService.upsertPremiumProcessorProduct({
      processorId: 'test',
      externalProductId: TEST_INACTIVE_PRODUCT_ID,
      externalBasePlanId: null,
      cadence: 'monthly',
    });
    await query(
      `UPDATE billing_processor_product SET is_active = FALSE WHERE external_product_id = $1`,
      [TEST_INACTIVE_PRODUCT_ID]
    );
    await productService.upsertPremiumProcessorProduct({
      processorId: 'paypal',
      externalProductId: PAYPAL_ONE_TIME_PRODUCT_IDS.monthly,
      externalBasePlanId: null,
      cadence: 'monthly',
    });

    await query(
      `INSERT INTO billing_checkout_channel (processor_id, platform, enabled)
       VALUES ('test', 'web', TRUE),
              ('test', 'ios', FALSE),
              ('test', 'android', FALSE)
       ON CONFLICT (processor_id, platform) DO UPDATE SET enabled = EXCLUDED.enabled`
    );
    await clearChannelCache();
  });

  afterAll(async () => {
    try {
      await query(`DELETE FROM billing_checkout_channel WHERE processor_id = 'test'`);
      await query(
        `UPDATE billing_checkout_channel SET min_client_version = NULL
         WHERE processor_id = 'apple' AND platform = 'ios'`
      );
      await query(
        `UPDATE billing_processor_product SET is_active = FALSE WHERE external_product_id = ANY($1)`,
        [[TEST_MONTHLY_PRODUCT_ID, TEST_ANNUAL_PRODUCT_ID, TEST_INACTIVE_PRODUCT_ID]]
      );
    } finally {
      await stopTestApp(server, ormContext);
      for (const [key, value] of Object.entries(savedEnv)) {
        if (value === undefined) {
          delete process.env[key];
        } else {
          process.env[key] = value;
        }
      }
    }
  });

  describe('GET /billing/checkout-options', () => {
    it('lists every active product for an enabled channel', async () => {
      const web = await request(app)
        .get(`${base}/billing/checkout-options?platform=web`)
        .expect(200);
      const webIds = web.body.processors.map((p: { processor_id: string }) => p.processor_id);
      expect(webIds).toEqual(expect.arrayContaining(['paypal', 'test']));
      const testProcessor = web.body.processors.find(
        (p: { processor_id: string }) => p.processor_id === 'test'
      );
      const testProductIds = testProcessor.products.map(
        (p: { external_product_id: string }) => p.external_product_id
      );
      expect(testProductIds).toEqual(
        expect.arrayContaining([TEST_MONTHLY_PRODUCT_ID, TEST_ANNUAL_PRODUCT_ID])
      );
      expect(testProductIds).not.toContain(TEST_INACTIVE_PRODUCT_ID);

      const ios = await request(app)
        .get(`${base}/billing/checkout-options?platform=ios`)
        .expect(200);
      const iosIds = ios.body.processors.map((p: { processor_id: string }) => p.processor_id);
      expect(iosIds).not.toContain('paypal');
      expect(iosIds).not.toContain('test');

      await query(
        `UPDATE billing_checkout_channel SET enabled = FALSE
         WHERE processor_id = 'test' AND platform = 'web'`
      );
      await clearChannelCache();
      try {
        const disabled = await request(app)
          .get(`${base}/billing/checkout-options?platform=web`)
          .expect(200);
        const disabledIds = disabled.body.processors.map(
          (p: { processor_id: string }) => p.processor_id
        );
        expect(disabledIds).not.toContain('test');
        expect(disabledIds).toContain('paypal');
      } finally {
        await query(
          `UPDATE billing_checkout_channel SET enabled = TRUE
           WHERE processor_id = 'test' AND platform = 'web'`
        );
        await clearChannelCache();
      }
    });

    it('omits PayPal and answers 404 on its webhook when the enable flag is off', async () => {
      const { initBillingContext } = await import('../lib/billing/billingContext.js');
      const { readBillingProcessorEnv } = await import('@podverse/helpers-config');
      const { config } = await import('../config/index.js');
      const savedFlag = process.env.BILLING_PAYPAL_ENABLED;
      delete process.env.BILLING_PAYPAL_ENABLED;
      const restore = (): void => {
        if (savedFlag === undefined) {
          delete process.env.BILLING_PAYPAL_ENABLED;
        } else {
          process.env.BILLING_PAYPAL_ENABLED = savedFlag;
        }
        initBillingContext({
          nodeEnv: config.nodeEnv,
          allowTestAdapter: config.billing.allowTestAdapter,
          sandboxAllowedAccountIds: config.billing.sandboxAllowedAccountIds,
          processors: readBillingProcessorEnv(process.env),
        });
      };

      initBillingContext({
        nodeEnv: config.nodeEnv,
        allowTestAdapter: config.billing.allowTestAdapter,
        sandboxAllowedAccountIds: config.billing.sandboxAllowedAccountIds,
        processors: readBillingProcessorEnv(process.env),
      });
      await clearChannelCache();
      try {
        const web = await request(app)
          .get(`${base}/billing/checkout-options?platform=web`)
          .expect(200);
        const webIds = web.body.processors.map((p: { processor_id: string }) => p.processor_id);
        expect(webIds).not.toContain('paypal');
        await request(app)
          .post(`${base}/billing/webhooks/paypal`)
          .set('Content-Type', 'application/json')
          .send(JSON.stringify({ id: `WH-OFF-${runId}` }))
          .expect(404);
      } finally {
        restore();
        await clearChannelCache();
      }
    });
  });

  describe('POST /billing/webhooks/paypal', () => {
    const webhookHeaders = (signature: string) => ({
      'Content-Type': 'application/json',
      'paypal-auth-algo': 'SHA256withRSA',
      'paypal-cert-url': 'https://api-m.sandbox.paypal.com/certs/vitest',
      'paypal-transmission-id': `vitest-${runId}`,
      'paypal-transmission-sig': signature,
      'paypal-transmission-time': new Date().toISOString(),
    });

    it('records a redelivered webhook once', async () => {
      const account = await createAccount();
      const captureId = `CAP-VITEST-${runId}`;
      const body = JSON.stringify({
        id: `WH-VITEST-${runId}`,
        event_type: 'PAYMENT.CAPTURE.COMPLETED',
        resource: {
          id: captureId,
          custom_id: account.billingCustomerRef,
          invoice_id: PAYPAL_ONE_TIME_PRODUCT_IDS.monthly,
          amount: { value: '3.00', currency_code: 'USD' },
          create_time: new Date().toISOString(),
        },
      });

      await request(app)
        .post(`${base}/billing/webhooks/paypal`)
        .set(webhookHeaders('good-signature'))
        .send(body)
        .expect(200);
      const afterFirst = await getStatus(account);
      expect(afterFirst.is_entitled).toBe(true);

      await request(app)
        .post(`${base}/billing/webhooks/paypal`)
        .set(webhookHeaders('good-signature'))
        .send(body)
        .expect(200);
      const afterSecond = await getStatus(account);
      expect(afterSecond.membership_expires_at).toBe(afterFirst.membership_expires_at);

      const rows = await query(
        `SELECT COUNT(*)::int AS count FROM billing_membership_grant g
         JOIN billing_transaction t ON t.id = g.billing_transaction_id
         WHERE t.processor_id = 'paypal' AND t.external_transaction_id = $1`,
        [captureId]
      );
      expect(rows).toEqual([{ count: 1 }]);
    });

    it('answers 400 when the signature does not verify', async () => {
      const res = await request(app)
        .post(`${base}/billing/webhooks/paypal`)
        .set(webhookHeaders('bad-signature'))
        .send(JSON.stringify({ id: `WH-BAD-${runId}`, event_type: 'PAYMENT.CAPTURE.COMPLETED' }))
        .expect(400);
      expect(res.body.code).toBe('billing.webhook_verification_failed');
    });

    it('answers 404 for a processor this server has not enabled', async () => {
      await request(app)
        .post(`${base}/billing/webhooks/apple`)
        .set('Content-Type', 'application/json')
        .send(JSON.stringify({ signedPayload: 'x' }))
        .expect(404);
    });
  });

  describe('POST /billing/test/simulate', () => {
    it('stacks two purchases in the membership expiry', async () => {
      const account = await createAccount();
      const firstId = `sim-stack-a-${runId}-${account.id}`;
      const secondId = `sim-stack-b-${runId}-${account.id}`;

      await simulate(account, payment(firstId)).expect(200);
      const afterFirst = await getStatus(account);
      await simulate(account, payment(secondId)).expect(200);
      const afterSecond = await getStatus(account);

      const expected = extendMembershipPeriodByCadence({
        membershipExpiresAt: new Date(afterFirst.membership_expires_at),
        cadence: 'monthly',
        now: new Date(afterFirst.membership_expires_at),
      });
      expect(afterSecond.membership_expires_at).toBe(expected.toISOString());
      expect(afterSecond.is_entitled).toBe(true);
    });

    it('extends a purchase during a trial past the trial end', async () => {
      const account = await createSignedUpAccount();
      const signedIn: TestAccount = {
        id: account.id,
        headers: authHeaders(account.id, account.id_text),
        billingCustomerRef: account.billing_customer_ref,
      };
      const before = await getStatus(signedIn);
      expect(before.is_entitled).toBe(true);

      await simulate(signedIn, payment(`sim-trial-${runId}-${account.id}`)).expect(200);
      const after = await getStatus(signedIn);
      const expected = extendMembershipPeriodByCadence({
        membershipExpiresAt: new Date(before.membership_expires_at),
        cadence: 'monthly',
        now: new Date(before.membership_expires_at),
      });
      expect(after.membership_expires_at).toBe(expected.toISOString());
    });

    it('shortens the expiry by one cadence when one stacked purchase is refunded', async () => {
      const account = await createAccount();
      const firstId = `sim-refund-a-${runId}-${account.id}`;
      const secondId = `sim-refund-b-${runId}-${account.id}`;

      await simulate(account, payment(firstId)).expect(200);
      const afterFirst = await getStatus(account);
      await simulate(account, payment(secondId)).expect(200);
      const refunded = await simulate(account, refund(secondId)).expect(200);

      expect(refunded.body.outcome.status).toBe('processed');
      expect(refunded.body.status.membership_expires_at).toBe(afterFirst.membership_expires_at);
      expect(refunded.body.status.is_entitled).toBe(true);
    });

    it('is refused where the environment is production-like', async () => {
      const account = await createAccount();
      const { initBillingContext } = await import('../lib/billing/billingContext.js');
      const { config } = await import('../config/index.js');

      initBillingContext({
        nodeEnv: 'production',
        allowTestAdapter: false,
        sandboxAllowedAccountIds: undefined,
        processors: { paypal: null, apple: null, googlePlay: null },
      });
      try {
        const res = await simulate(account, payment(`sim-prod-${runId}`)).expect(403);
        expect(res.body.code).toBe('billing.test_adapter_unavailable');
        expect(res.body.i18nKey).toBe('billing.test_adapter_unavailable');
      } finally {
        initBillingContext({
          nodeEnv: config.nodeEnv,
          allowTestAdapter: config.billing.allowTestAdapter,
          sandboxAllowedAccountIds: config.billing.sandboxAllowedAccountIds,
          processors: config.billing.processors,
        });
      }
    });
  });

  describe('removed purchase routes', () => {
    it('answers 404 for PayPal subscription create and cancel', async () => {
      const account = await createAccount();
      await request(app)
        .post(`${base}/billing/paypal/subscriptions`)
        .set(account.headers)
        .send({ processor_product_id: 1 })
        .expect(404);
      await request(app)
        .post(`${base}/billing/subscriptions/1/cancel`)
        .set(account.headers)
        .send({})
        .expect(404);
    });
  });

  describe('Apple signed transaction body', () => {
    it('accepts a compact JWS and rejects anything else', async () => {
      const account = await createAccount();
      const accepted = await request(app)
        .post(`${base}/billing/apple/transactions`)
        .set(account.headers)
        .send({ transaction_id: `apple-tx-${runId}`, signed_transaction: 'aGVhZGVy.cGF5bG9hZA.' })
        .expect(404);
      expect(accepted.body.code).toBe('billing.processor_unavailable');

      await request(app)
        .post(`${base}/billing/apple/transactions`)
        .set(account.headers)
        .send({ transaction_id: `apple-tx-${runId}`, signed_transaction: 'not a jws' })
        .expect(400);
    });
  });

  describe('client version floor', () => {
    it('answers 426 when the installed app is older than the channel minimum', async () => {
      const account = await createAccount();
      await query(
        `UPDATE billing_checkout_channel SET min_client_version = '99.0.0'
         WHERE processor_id = 'apple' AND platform = 'ios'`
      );
      await clearChannelCache();
      try {
        const res = await request(app)
          .post(`${base}/billing/apple/transactions`)
          .set(account.headers)
          .set(BILLING_CLIENT_PLATFORM_HEADER, 'ios')
          .set(BILLING_CLIENT_VERSION_HEADER, '5.0.0')
          .send({ transaction_id: `apple-tx-${runId}` })
          .expect(426);
        expect(res.body).toMatchObject({
          code: 'billing.client_update_required',
          i18nKey: 'billing.client_update_required',
          min_client_version: '99.0.0',
        });

        const current = await request(app)
          .post(`${base}/billing/apple/transactions`)
          .set(account.headers)
          .set(BILLING_CLIENT_PLATFORM_HEADER, 'ios')
          .set(BILLING_CLIENT_VERSION_HEADER, '99.0.0')
          .send({ transaction_id: `apple-tx-${runId}` })
          .expect(404);
        expect(current.body.code).toBe('billing.processor_unavailable');
      } finally {
        await query(
          `UPDATE billing_checkout_channel SET min_client_version = NULL
           WHERE processor_id = 'apple' AND platform = 'ios'`
        );
        await clearChannelCache();
      }
    });
  });

  describe('signup', () => {
    it('starts a new account on a trial grant that sets its expiry', async () => {
      const { BillingMembershipGrantService } = await import('@podverse/orm');
      const account = await createSignedUpAccount();
      const grants = await new BillingMembershipGrantService().listForAccount(account.id);

      expect(grants).toHaveLength(1);
      const [trialGrant] = grants;
      expect(trialGrant?.source).toBe('trial');
      expect(trialGrant?.revoked_at).toBeNull();

      const status = await getStatus({
        id: account.id,
        headers: authHeaders(account.id, account.id_text),
        billingCustomerRef: account.billing_customer_ref,
      });
      expect(status.is_entitled).toBe(true);
      expect(status.membership_expires_at).toBe(trialGrant?.ends_at.toISOString());
    });
  });

  it('GET /billing/status requires sign-in', async () => {
    await request(app).get(`${base}/billing/status`).expect(401);
  });
});
