import type {
  CapturedPayment,
  Order,
  OrderRequest,
  PaymentAuthorization,
} from '@paypal/paypal-server-sdk';
import {
  CheckoutPaymentIntent,
  Client,
  Environment,
  ItemCategory,
  OrdersController,
  PaymentsController,
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

export interface PayPalServiceParams {
  clientId: string;
  clientSecret: string;
  paypalEnvironment?: PayPalEnvironment;
  nodeEnv?: string;
  webhookId?: string;
  ordersController?: OrdersControllerLike;
  paymentsController?: PaymentsControllerLike;
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

export class PayPalService {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetchImpl: typeof fetch;
  private readonly ordersController: OrdersControllerLike;
  private readonly paymentsController: PaymentsControllerLike;
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

    if (ordersController !== undefined && paymentsController !== undefined) {
      this.ordersController = ordersController;
      this.paymentsController = paymentsController;
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
