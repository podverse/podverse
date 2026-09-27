import type {
  CapturedPayment,
  CreateSubscriptionRequest,
  Order,
  OrderRequest,
  PaymentAuthorization,
  Subscription,
} from '@paypal/paypal-server-sdk';
import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  ItemCategory,
  OrdersController,
  PaymentsController,
  SubscriptionsController,
} from '@paypal/paypal-server-sdk';

import type { BillingCadence } from '@podverse/helpers';
import { PAYPAL_ONE_TIME_PRODUCT_IDS } from '@podverse/helpers';

export type PayPalEnvironment = 'sandbox' | 'live';

interface ControllerResult<T> {
  result?: T | null;
}

interface OrdersControllerLike {
  createOrder(params: {
    body: OrderRequest;
    paypalRequestId?: string;
    prefer?: string;
  }): Promise<ControllerResult<Order>>;
  captureOrder(params: {
    id: string;
    paypalRequestId?: string;
    prefer?: string;
  }): Promise<ControllerResult<Order>>;
}

interface PaymentsControllerLike {
  getAuthorizedPayment(params: { authorizationId: string }): Promise<ControllerResult<unknown>>;
  getCapturedPayment(params: { captureId: string }): Promise<ControllerResult<CapturedPayment>>;
}

interface SubscriptionsControllerLike {
  createSubscription(params: {
    body?: CreateSubscriptionRequest;
    paypalRequestId?: string;
    prefer?: string;
  }): Promise<ControllerResult<Subscription>>;
  getSubscription(params: { id: string }): Promise<ControllerResult<Subscription>>;
  cancelSubscription(params: { id: string; body?: { reason: string } }): Promise<unknown>;
}

export interface PayPalServiceParams {
  clientId: string;
  clientSecret: string;
  paypalEnvironment?: PayPalEnvironment;
  nodeEnv?: string;
  webhookId?: string;
  ordersController?: OrdersControllerLike;
  paymentsController?: PaymentsControllerLike;
  subscriptionsController?: SubscriptionsControllerLike;
  fetchImpl?: typeof fetch;
}

export interface CreatePayPalOrderParams {
  accountBillingCustomerRef: string;
  cadence: BillingCadence;
  amount: string;
  currencyCode: string;
  cancelUrl?: string;
  paypalRequestId?: string;
  returnUrl?: string;
}

export interface CapturePayPalOrderParams {
  orderId: string;
  paypalRequestId?: string;
}

export interface CreatePayPalSubscriptionParams {
  accountBillingCustomerRef: string;
  planId: string;
  paypalRequestId?: string;
  startTime?: string;
  /** PayPal needs both URLs to send the buyer back; either alone is ignored. */
  returnUrl?: string;
  cancelUrl?: string;
}

export interface PayPalWebhookVerificationPayload {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookEvent: Record<string, unknown>;
  webhookId?: string;
}

function isPaymentAuthorization(value: unknown): value is PaymentAuthorization {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = Reflect.get(record, key);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function requireResult<T>(result: ControllerResult<T>, context: string): T {
  if (result.result === undefined || result.result === null) {
    throw new Error(`PayPal ${context} result is missing`);
  }
  return result.result;
}

const PAYPAL_CATALOG_PRODUCT_NAME = 'Podverse Premium';
const PAYPAL_E2E_DAILY_PLAN_NAME = 'Podverse Premium E2E Daily';

function readNamedId(items: unknown, name: string): string | null {
  if (!Array.isArray(items)) {
    return null;
  }
  for (const item of items) {
    if (!isRecord(item)) {
      continue;
    }
    if (readString(item, 'name') !== name) {
      continue;
    }
    const id = readString(item, 'id');
    if (id !== null) {
      return id;
    }
  }
  return null;
}

function requirePayPalId(record: Record<string, unknown>, context: string): string {
  const id = readString(record, 'id');
  if (id === null) {
    throw new Error(`PayPal ${context} response is missing id`);
  }
  return id;
}

export class PayPalService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetchImpl: typeof fetch;
  private readonly ordersController: OrdersControllerLike;
  private readonly paymentsController: PaymentsControllerLike;
  private readonly subscriptionsController: SubscriptionsControllerLike;
  private readonly paypalEnvironment: PayPalEnvironment;
  private readonly webhookId: string | null;

  constructor(params: PayPalServiceParams) {
    this.clientId = params.clientId;
    this.clientSecret = params.clientSecret;
    this.fetchImpl = params.fetchImpl ?? fetch;
    this.paypalEnvironment = PayPalService.resolveEnvironment(
      params.paypalEnvironment,
      params.nodeEnv
    );
    this.webhookId = params.webhookId ?? null;

    const ordersController = params.ordersController;
    const paymentsController = params.paymentsController;
    const subscriptionsController = params.subscriptionsController;

    if (
      ordersController !== undefined &&
      paymentsController !== undefined &&
      subscriptionsController !== undefined
    ) {
      this.ordersController = ordersController;
      this.paymentsController = paymentsController;
      this.subscriptionsController = subscriptionsController;
      return;
    }

    const client = new Client({
      clientCredentialsAuthCredentials: {
        oAuthClientId: this.clientId,
        oAuthClientSecret: this.clientSecret,
      },
      environment: this.paypalEnvironment === 'live' ? Environment.Production : Environment.Sandbox,
      timeout: 0,
    });

    this.ordersController = params.ordersController ?? new OrdersController(client);
    this.paymentsController = params.paymentsController ?? new PaymentsController(client);
    this.subscriptionsController =
      params.subscriptionsController ?? new SubscriptionsController(client);
  }

  static resolveEnvironment(
    paypalEnvironment?: PayPalEnvironment,
    nodeEnv: string | undefined = 'development'
  ): PayPalEnvironment {
    if (paypalEnvironment === 'sandbox' || paypalEnvironment === 'live') {
      return paypalEnvironment;
    }
    return nodeEnv === 'production' ? 'live' : 'sandbox';
  }

  isSandboxEnvironment(): boolean {
    return this.paypalEnvironment === 'sandbox';
  }

  async createOrder(params: CreatePayPalOrderParams): Promise<Order> {
    const sku = PAYPAL_ONE_TIME_PRODUCT_IDS[params.cadence];
    const body: OrderRequest = {
      intent: CheckoutPaymentIntent.Capture,
      purchaseUnits: [
        {
          amount: {
            currencyCode: params.currencyCode,
            value: params.amount,
          },
          customId: params.accountBillingCustomerRef,
          invoiceId: sku,
          items: [
            {
              category: ItemCategory.DigitalGoods,
              name: 'Premium Membership',
              quantity: '1',
              sku,
              unitAmount: {
                currencyCode: params.currencyCode,
                value: params.amount,
              },
            },
          ],
        },
      ],
    };

    if (params.returnUrl !== undefined || params.cancelUrl !== undefined) {
      body.applicationContext = {
        cancelUrl: params.cancelUrl,
        returnUrl: params.returnUrl,
      };
    }

    const response = await this.ordersController.createOrder({
      body,
      paypalRequestId: params.paypalRequestId,
      prefer: 'return=representation',
    });
    return requireResult(response, 'create order');
  }

  async captureOrder(params: CapturePayPalOrderParams): Promise<Order> {
    const response = await this.ordersController.captureOrder({
      id: params.orderId,
      paypalRequestId: params.paypalRequestId,
      prefer: 'return=representation',
    });
    return requireResult(response, 'capture order');
  }

  async createSubscription(params: CreatePayPalSubscriptionParams): Promise<Subscription> {
    const body: CreateSubscriptionRequest = {
      customId: params.accountBillingCustomerRef,
      planId: params.planId,
      startTime: params.startTime,
    };
    if (params.returnUrl !== undefined && params.cancelUrl !== undefined) {
      body.applicationContext = {
        returnUrl: params.returnUrl,
        cancelUrl: params.cancelUrl,
      };
    }

    const response = await this.subscriptionsController.createSubscription({
      body,
      paypalRequestId: params.paypalRequestId,
      prefer: 'return=representation',
    });
    return requireResult(response, 'create subscription');
  }

  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    const response = await this.subscriptionsController.getSubscription({ id: subscriptionId });
    return response.result ?? null;
  }

  async cancelSubscription(subscriptionId: string, reason?: string): Promise<void> {
    await this.subscriptionsController.cancelSubscription({
      id: subscriptionId,
      body: reason === undefined ? undefined : { reason },
    });
  }

  /**
   * Sandbox billing plan that renews every day. Reuses the catalog product and an existing plan
   * of the same name. The caller asserts `next_billing_time` instead of waiting out the day.
   */
  async ensureDailyRenewalPlan(): Promise<{ planId: string }> {
    if (!this.isSandboxEnvironment()) {
      throw new Error('Daily renewal plans are created only in the PayPal sandbox');
    }

    const accessToken = await this.getAccessToken();
    const productId = await this.findOrCreateCatalogProduct(accessToken);
    const existingPlanId = await this.findPlanIdByName(
      accessToken,
      productId,
      PAYPAL_E2E_DAILY_PLAN_NAME
    );
    if (existingPlanId !== null) {
      return { planId: existingPlanId };
    }

    const created = await this.payPalJson(`${this.getApiBaseUrl()}/v1/billing/plans`, accessToken, {
      method: 'POST',
      headers: {
        Prefer: 'return=representation',
        'PayPal-Request-Id': 'podverse-premium-plan-e2e-daily',
      },
      body: JSON.stringify({
        product_id: productId,
        name: PAYPAL_E2E_DAILY_PLAN_NAME,
        description: PAYPAL_E2E_DAILY_PLAN_NAME,
        status: 'ACTIVE',
        billing_cycles: [
          {
            frequency: { interval_unit: 'DAY', interval_count: 1 },
            tenure_type: 'REGULAR',
            sequence: 1,
            total_cycles: 0,
            pricing_scheme: {
              fixed_price: { value: '1.00', currency_code: 'USD' },
            },
          },
        ],
        payment_preferences: {
          auto_bill_outstanding: true,
          setup_fee_failure_action: 'CONTINUE',
          payment_failure_threshold: 3,
        },
      }),
    });
    return { planId: requirePayPalId(created, 'daily renewal plan') };
  }

  async getPaymentInfo(paymentId: string): Promise<PaymentAuthorization | null> {
    const response = await this.paymentsController.getAuthorizedPayment({
      authorizationId: paymentId,
    });
    const result = response.result;
    if (!isPaymentAuthorization(result)) {
      return null;
    }
    return result;
  }

  async getCaptureInfo(paymentId: string): Promise<CapturedPayment | null> {
    const response = await this.paymentsController.getCapturedPayment({
      captureId: paymentId,
    });
    return response.result ?? null;
  }

  async verifyWebhookSignature(params: PayPalWebhookVerificationPayload): Promise<boolean> {
    const webhookId = params.webhookId ?? this.webhookId;
    if (webhookId === null || webhookId === '') {
      throw new Error('PAYPAL_WEBHOOK_ID is required to verify webhook signatures.');
    }

    const accessToken = await this.getAccessToken();
    const response = await this.fetchImpl(
      `${this.getApiBaseUrl()}/v1/notifications/verify-webhook-signature`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auth_algo: params.authAlgo,
          cert_url: params.certUrl,
          transmission_id: params.transmissionId,
          transmission_sig: params.transmissionSig,
          transmission_time: params.transmissionTime,
          webhook_event: params.webhookEvent,
          webhook_id: webhookId,
        }),
      }
    );

    if (!response.ok) {
      return false;
    }

    const payload: unknown = await response.json();
    if (!isRecord(payload)) {
      return false;
    }

    return readString(payload, 'verification_status') === 'SUCCESS';
  }

  private async findOrCreateCatalogProduct(accessToken: string): Promise<string> {
    const listed = await this.payPalJson(
      `${this.getApiBaseUrl()}/v1/catalogs/products?page_size=20&page=1&total_required=true`,
      accessToken
    );
    const existingId = readNamedId(listed.products, PAYPAL_CATALOG_PRODUCT_NAME);
    if (existingId !== null) {
      return existingId;
    }

    const created = await this.payPalJson(
      `${this.getApiBaseUrl()}/v1/catalogs/products`,
      accessToken,
      {
        method: 'POST',
        headers: { 'PayPal-Request-Id': 'podverse-premium-catalog-product' },
        body: JSON.stringify({
          name: PAYPAL_CATALOG_PRODUCT_NAME,
          description: 'Podverse Premium membership',
          type: 'SERVICE',
          category: 'SOFTWARE',
        }),
      }
    );
    return requirePayPalId(created, 'catalog product');
  }

  private async findPlanIdByName(
    accessToken: string,
    productId: string,
    name: string
  ): Promise<string | null> {
    const query = new URLSearchParams({
      product_id: productId,
      page_size: '20',
      page: '1',
      total_required: 'true',
    });
    const listed = await this.payPalJson(
      `${this.getApiBaseUrl()}/v1/billing/plans?${query.toString()}`,
      accessToken
    );
    return readNamedId(listed.plans, name);
  }

  private async payPalJson(
    url: string,
    accessToken: string,
    init?: { method?: string; headers?: Record<string, string>; body?: string }
  ): Promise<Record<string, unknown>> {
    const response = await this.fetchImpl(url, {
      method: init?.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        ...init?.headers,
      },
      body: init?.body,
    });
    const payload: unknown = await response.json().catch(() => null);
    if (!response.ok || !isRecord(payload)) {
      throw new Error(`PayPal ${response.status} ${url}`);
    }
    return payload;
  }

  private getApiBaseUrl(): string {
    return this.paypalEnvironment === 'live'
      ? 'https://api-m.paypal.com'
      : 'https://api-m.sandbox.paypal.com';
  }

  private async getAccessToken(): Promise<string> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64');
    const tokenResponse = await this.fetchImpl(`${this.getApiBaseUrl()}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ grant_type: 'client_credentials' }),
    });

    if (!tokenResponse.ok) {
      throw new Error(`PayPal OAuth token request failed with status ${tokenResponse.status}`);
    }

    const tokenPayload: unknown = await tokenResponse.json();
    if (!isRecord(tokenPayload)) {
      throw new Error('PayPal OAuth token response is not an object');
    }

    const accessToken = readString(tokenPayload, 'access_token');
    if (accessToken === null) {
      throw new Error('PayPal OAuth token response is missing access_token');
    }

    return accessToken;
  }
}
