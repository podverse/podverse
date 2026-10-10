import type {
  BillingAmount,
  BillingWebhookParseResult,
  BillingWebhookRequest,
  NormalizedBillingEvent,
  NormalizedTransactionSnapshot,
  PaymentProcessorAdapter,
} from '@podverse/helpers';
import {
  BillingProcessorRecordNotFoundError,
  BillingWebhookVerificationError,
  resolveBillingProcessorProductsFromEnv,
} from '@podverse/helpers';

import type { PayPalEnvironment, PayPalServiceParams } from './payPalService.js';
import { PayPalService } from './payPalService.js';

interface SoldBillingProduct {
  externalProductId: string;
  externalBasePlanId: string | null;
}

interface PayPalAdapterConfig extends PayPalServiceParams {
  webhookId: string;
  service?: PayPalService;
  /**
   * Product ids this deployment sells. When omitted, the ids come from the billing product env.
   * PayPal's one-time product ids are always included there.
   */
  soldProducts?: readonly SoldBillingProduct[];
}

function loadSoldProducts(
  override: readonly SoldBillingProduct[] | undefined
): readonly SoldBillingProduct[] {
  if (override !== undefined) {
    return override;
  }
  return resolveBillingProcessorProductsFromEnv(process.env).products.filter(
    (product) => product.processor === 'paypal'
  );
}

function isSoldProduct(
  products: readonly SoldBillingProduct[],
  externalProductId: string | null
): boolean {
  if (externalProductId === null || externalProductId === '') {
    return false;
  }
  return products.some(
    (product) =>
      product.externalProductId === externalProductId && product.externalBasePlanId === null
  );
}

function logUnmappedBillingProduct(productId: string | null, notificationType: string): void {
  // An authentic notification for a product this deployment does not sell is ignored.
  // eslint-disable-next-line no-console -- info is the level for a skipped notification
  console.info(
    `Billing notification ignored for an unmapped product processor=paypal productId=${productId ?? ''} notificationType=${notificationType}`
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = Reflect.get(record, key);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = Reflect.get(record, key);
  return isRecord(value) ? value : null;
}

function readHeader(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  key: string
): string | null {
  const value = headers[key];
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'string' && item.length > 0) {
        return item;
      }
    }
  }
  return null;
}

function requireHeader(
  headers: Readonly<Record<string, string | string[] | undefined>>,
  key: string
): string {
  const value = readHeader(headers, key);
  if (value === null) {
    throw new BillingWebhookVerificationError('paypal', `Missing webhook header ${key}`);
  }
  return value;
}

function parseWebhookPayload(rawBody: Uint8Array | string): Record<string, unknown> {
  const text = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BillingWebhookVerificationError('paypal', 'Webhook body is not valid JSON');
  }
  if (!isRecord(parsed)) {
    throw new BillingWebhookVerificationError('paypal', 'Webhook body must be a JSON object');
  }
  return parsed;
}

function toRawPayload(value: unknown): Record<string, unknown> {
  const json = JSON.stringify(value);
  const parsed: unknown = JSON.parse(json);
  return isRecord(parsed) ? parsed : {};
}

function readAmount(record: Record<string, unknown>): BillingAmount | null {
  const amount = readRecord(record, 'amount');
  if (amount === null) {
    return null;
  }
  const value = readString(amount, 'value') ?? readString(amount, 'total');
  const currencyCode = readString(amount, 'currency_code') ?? readString(amount, 'currency');
  if (value === null || currencyCode === null) {
    return null;
  }
  return { value, currencyCode };
}

function readOccurredAt(
  payload: Record<string, unknown>,
  resource: Record<string, unknown>,
  nowIso: string
): string {
  return (
    readString(resource, 'create_time') ??
    readString(resource, 'update_time') ??
    readString(payload, 'create_time') ??
    readString(payload, 'event_time') ??
    nowIso
  );
}

function mapCaptureCompletedEvent(
  payload: Record<string, unknown>,
  resource: Record<string, unknown>,
  soldProducts: readonly SoldBillingProduct[],
  isSandbox: boolean,
  nowIso: string
): NormalizedBillingEvent[] {
  const transactionId = readString(resource, 'id');
  if (transactionId === null) {
    return [];
  }

  const externalProductId = readString(resource, 'invoice_id');
  if (!isSoldProduct(soldProducts, externalProductId)) {
    logUnmappedBillingProduct(externalProductId, 'PAYMENT.CAPTURE.COMPLETED');
    return [];
  }

  return [
    {
      type: 'payment_settled',
      processor: 'paypal',
      processorEventId: readString(payload, 'id') ?? transactionId,
      accountBillingCustomerRef: readString(resource, 'custom_id'),
      accountId: null,
      occurredAt: readOccurredAt(payload, resource, nowIso),
      isSandbox,
      externalTransactionId: transactionId,
      externalProductId,
      externalBasePlanId: null,
      periodStart: null,
      periodEnd: null,
      amount: readAmount(resource),
    },
  ];
}

function mapRefundOrRevokeEvent(
  payload: Record<string, unknown>,
  resource: Record<string, unknown>,
  reason: 'refund' | 'chargeback',
  eventType: string,
  soldProducts: readonly SoldBillingProduct[],
  isSandbox: boolean,
  nowIso: string
): NormalizedBillingEvent[] {
  const transactionId = readString(resource, 'id');
  if (transactionId === null) {
    return [];
  }
  const externalProductId = readString(resource, 'invoice_id');
  if (externalProductId !== null && !isSoldProduct(soldProducts, externalProductId)) {
    logUnmappedBillingProduct(externalProductId, eventType);
    return [];
  }
  const occurredAt = readOccurredAt(payload, resource, nowIso);
  return [
    {
      type: 'refund_or_revoke',
      processor: 'paypal',
      processorEventId: readString(payload, 'id') ?? `${transactionId}:${reason}`,
      accountBillingCustomerRef: readString(resource, 'custom_id'),
      accountId: null,
      occurredAt,
      isSandbox,
      reason,
      revokedAt: occurredAt,
      externalTransactionId: transactionId,
    },
  ];
}

function mapWebhookPayloadToEvents(
  payload: Record<string, unknown>,
  soldProducts: readonly SoldBillingProduct[],
  isSandbox: boolean,
  nowIso: string
): NormalizedBillingEvent[] {
  const eventType = readString(payload, 'event_type');
  if (eventType === null) {
    return [];
  }
  const resource = readRecord(payload, 'resource');
  if (resource === null) {
    return [];
  }

  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    return mapCaptureCompletedEvent(payload, resource, soldProducts, isSandbox, nowIso);
  }
  if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
    return mapRefundOrRevokeEvent(
      payload,
      resource,
      'refund',
      eventType,
      soldProducts,
      isSandbox,
      nowIso
    );
  }
  if (eventType === 'PAYMENT.CAPTURE.REVERSED') {
    return mapRefundOrRevokeEvent(
      payload,
      resource,
      'chargeback',
      eventType,
      soldProducts,
      isSandbox,
      nowIso
    );
  }
  return [];
}

/** SDK records use camelCase keys where webhook resources use snake_case. */
function readSdkMoney(record: Record<string, unknown>): BillingAmount | null {
  const amount = readRecord(record, 'amount');
  if (amount === null) {
    return null;
  }
  const value = readString(amount, 'value');
  const currencyCode = readString(amount, 'currencyCode');
  return value === null || currencyCode === null ? null : { value, currencyCode };
}

/** Reads a `CapturedPayment` from the Payments API, which the SDK returns in camelCase. */
function mapCaptureToSnapshot(
  capture: Record<string, unknown>,
  ref: { externalId: string; externalProductId: string | null },
  soldProducts: readonly SoldBillingProduct[],
  isSandbox: boolean,
  fetchedAt: string
): NormalizedTransactionSnapshot {
  const externalProductId = ref.externalProductId ?? readString(capture, 'invoiceId');
  if (!isSoldProduct(soldProducts, externalProductId)) {
    logUnmappedBillingProduct(externalProductId, 'fetchTransaction');
    throw new BillingProcessorRecordNotFoundError('paypal', ref.externalId);
  }
  const status = readString(capture, 'status');
  const createTime = readString(capture, 'createTime');

  return {
    processor: 'paypal',
    externalTransactionId: readString(capture, 'id') ?? ref.externalId,
    accountBillingCustomerRef: readString(capture, 'customId'),
    externalProductId,
    externalBasePlanId: null,
    settledAt: createTime ?? fetchedAt,
    periodStart: null,
    periodEnd: null,
    amount: readSdkMoney(capture),
    revokedAt:
      status === 'REFUNDED' || status === 'REVERSED'
        ? (readString(capture, 'updateTime') ?? createTime ?? fetchedAt)
        : null,
    revocationReason:
      status === 'REFUNDED' ? 'refund' : status === 'REVERSED' ? 'chargeback' : null,
    isSandbox,
    fetchedAt,
    schemaVersion: 'paypal-capture-v1',
    rawPayload: capture,
  };
}

export function createPayPalAdapter(config: PayPalAdapterConfig): PaymentProcessorAdapter {
  const service =
    config.service ??
    new PayPalService({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      fetchImpl: config.fetchImpl,
      nodeEnv: config.nodeEnv,
      ordersController: config.ordersController,
      paypalEnvironment: config.paypalEnvironment,
      paymentsController: config.paymentsController,
      webhookId: config.webhookId,
    });
  const soldProducts = loadSoldProducts(config.soldProducts);

  const nowIso = (): string => new Date().toISOString();
  const isSandbox = service.isSandboxEnvironment();

  return {
    id: 'paypal',
    async verifyAndParseWebhook(
      request: BillingWebhookRequest
    ): Promise<BillingWebhookParseResult> {
      const payload = parseWebhookPayload(request.rawBody);

      const isValid = await service.verifyWebhookSignature({
        authAlgo: requireHeader(request.headers, 'paypal-auth-algo'),
        certUrl: requireHeader(request.headers, 'paypal-cert-url'),
        transmissionId: requireHeader(request.headers, 'paypal-transmission-id'),
        transmissionSig: requireHeader(request.headers, 'paypal-transmission-sig'),
        transmissionTime: requireHeader(request.headers, 'paypal-transmission-time'),
        webhookEvent: payload,
        webhookId: config.webhookId,
      });

      if (!isValid) {
        throw new BillingWebhookVerificationError(
          'paypal',
          'PayPal webhook signature verification failed'
        );
      }

      const events = mapWebhookPayloadToEvents(payload, soldProducts, isSandbox, nowIso());
      return {
        schemaVersion: 'paypal-webhook-v1',
        rawPayload: payload,
        events,
      };
    },

    async fetchTransaction(ref): Promise<NormalizedTransactionSnapshot> {
      const capture = await service.getCaptureInfo(ref.externalId);
      if (capture === null) {
        throw new BillingProcessorRecordNotFoundError('paypal', ref.externalId);
      }
      return mapCaptureToSnapshot(toRawPayload(capture), ref, soldProducts, isSandbox, nowIso());
    },
  };
}

export function resolvePayPalEnvironment(
  paypalEnvironment: PayPalEnvironment | undefined,
  nodeEnv: string | undefined
): PayPalEnvironment {
  return PayPalService.resolveEnvironment(paypalEnvironment, nodeEnv);
}
