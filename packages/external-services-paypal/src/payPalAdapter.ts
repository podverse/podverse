import {
  PAYPAL_ONE_TIME_PRODUCT_IDS,
  BillingProcessorRecordNotFoundError,
  BillingWebhookVerificationError,
} from '@podverse/helpers';
import type {
  BillingAmount,
  BillingWebhookRequest,
  BillingWebhookParseResult,
  NormalizedBillingEvent,
  NormalizedSubscriptionSnapshot,
  NormalizedTransactionSnapshot,
  PaymentProcessorAdapter,
} from '@podverse/helpers';

import { PayPalService } from './payPalService.js';
import type { PayPalEnvironment, PayPalServiceParams } from './payPalService.js';

interface PayPalAdapterConfig extends PayPalServiceParams {
  webhookId: string;
  service?: PayPalService;
}

type PayPalSubscriptionStatus =
  'APPROVAL_PENDING' | 'APPROVED' | 'ACTIVE' | 'SUSPENDED' | 'CANCELLED' | 'EXPIRED';

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

function inferPurchaseKind(
  externalProductId: string | null,
  subscriptionId: string | null
): 'one_time' | 'auto_renew' {
  if (subscriptionId !== null) {
    return 'auto_renew';
  }
  if (
    externalProductId === PAYPAL_ONE_TIME_PRODUCT_IDS.monthly ||
    externalProductId === PAYPAL_ONE_TIME_PRODUCT_IDS.annual
  ) {
    return 'one_time';
  }
  return 'auto_renew';
}

function mapSubscriptionStatus(status: string | null): NormalizedSubscriptionSnapshot['status'] {
  const typedStatus: PayPalSubscriptionStatus | null =
    status === 'APPROVAL_PENDING' ||
    status === 'APPROVED' ||
    status === 'ACTIVE' ||
    status === 'SUSPENDED' ||
    status === 'CANCELLED' ||
    status === 'EXPIRED'
      ? status
      : null;
  if (typedStatus === null) {
    return 'pending';
  }
  if (typedStatus === 'APPROVAL_PENDING' || typedStatus === 'APPROVED') {
    return 'pending';
  }
  if (typedStatus === 'ACTIVE') {
    return 'active';
  }
  if (typedStatus === 'SUSPENDED') {
    return 'in_grace_period';
  }
  if (typedStatus === 'CANCELLED') {
    return 'cancelled_active';
  }
  return 'expired';
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

async function resolvePlanId(
  service: PayPalService,
  resource: Record<string, unknown>,
  subscriptionId: string | null
): Promise<string | null> {
  const planId = readString(resource, 'plan_id');
  if (planId !== null) {
    return planId;
  }
  if (subscriptionId === null) {
    return null;
  }
  const subscription = await service.getSubscription(subscriptionId);
  return subscription?.planId ?? null;
}

async function mapCaptureCompletedEvent(
  payload: Record<string, unknown>,
  resource: Record<string, unknown>,
  service: PayPalService,
  isSandbox: boolean,
  nowIso: string
): Promise<NormalizedBillingEvent[]> {
  const transactionId = readString(resource, 'id');
  if (transactionId === null) {
    return [];
  }

  const subscriptionId = readString(resource, 'billing_agreement_id');
  let externalProductId = readString(resource, 'invoice_id');
  if (externalProductId === null && subscriptionId !== null) {
    externalProductId = await resolvePlanId(service, resource, subscriptionId);
  }
  if (externalProductId === null && subscriptionId === null) {
    return [];
  }

  const processorEventId = readString(payload, 'id') ?? transactionId;
  return [
    {
      type: 'payment_settled',
      processor: 'paypal',
      processorEventId,
      accountBillingCustomerRef: readString(resource, 'custom_id'),
      accountId: null,
      occurredAt: readOccurredAt(payload, resource, nowIso),
      isSandbox,
      purchaseKind: inferPurchaseKind(externalProductId, subscriptionId),
      externalTransactionId: transactionId,
      externalSubscriptionId: subscriptionId,
      externalProductId,
      externalBasePlanId: null,
      periodStart: null,
      periodEnd: null,
      amount: readAmount(resource),
    },
  ];
}

async function mapSubscriptionPaymentCompletedEvent(
  payload: Record<string, unknown>,
  resource: Record<string, unknown>,
  service: PayPalService,
  isSandbox: boolean,
  nowIso: string
): Promise<NormalizedBillingEvent[]> {
  const subscriptionId = readString(resource, 'billing_agreement_id');
  if (subscriptionId === null) {
    return [];
  }
  const transactionId = readString(resource, 'id') ?? readString(payload, 'id');
  if (transactionId === null) {
    return [];
  }

  let planId = readString(resource, 'plan_id');
  let accountBillingCustomerRef = readString(resource, 'custom_id');
  if (planId === null || accountBillingCustomerRef === null) {
    const subscription = await service.getSubscription(subscriptionId);
    if (planId === null) {
      planId = subscription?.planId ?? null;
    }
    if (accountBillingCustomerRef === null) {
      accountBillingCustomerRef = subscription?.customId ?? null;
    }
  }
  if (planId === null) {
    return [];
  }

  return [
    {
      type: 'payment_settled',
      processor: 'paypal',
      processorEventId: readString(payload, 'id') ?? `${transactionId}:settled`,
      accountBillingCustomerRef,
      accountId: null,
      occurredAt: readOccurredAt(payload, resource, nowIso),
      isSandbox,
      purchaseKind: 'auto_renew',
      externalTransactionId: transactionId,
      externalSubscriptionId: subscriptionId,
      externalProductId: planId,
      externalBasePlanId: null,
      periodStart: null,
      periodEnd: null,
      amount: readAmount(resource),
    },
  ];
}

async function mapSubscriptionActivatedEvent(
  payload: Record<string, unknown>,
  resource: Record<string, unknown>,
  service: PayPalService,
  isSandbox: boolean,
  nowIso: string
): Promise<NormalizedBillingEvent[]> {
  const subscriptionId = readString(resource, 'id');
  if (subscriptionId === null) {
    return [];
  }

  const planId = await resolvePlanId(service, resource, subscriptionId);

  return [
    {
      type: 'subscription_activated',
      processor: 'paypal',
      processorEventId: readString(payload, 'id') ?? `${subscriptionId}:activated`,
      accountBillingCustomerRef: readString(resource, 'custom_id'),
      accountId: null,
      occurredAt: readOccurredAt(payload, resource, nowIso),
      isSandbox,
      externalSubscriptionId: subscriptionId,
      externalProductId: planId,
      externalBasePlanId: null,
      periodStart: readString(resource, 'start_time'),
      periodEnd: readString(readRecord(resource, 'billing_info') ?? {}, 'next_billing_time'),
    },
  ];
}

function mapSubscriptionCancelledEvent(
  payload: Record<string, unknown>,
  resource: Record<string, unknown>,
  isSandbox: boolean,
  nowIso: string
): NormalizedBillingEvent[] {
  const subscriptionId = readString(resource, 'id');
  if (subscriptionId === null) {
    return [];
  }
  return [
    {
      type: 'subscription_cancelled',
      processor: 'paypal',
      processorEventId: readString(payload, 'id') ?? `${subscriptionId}:cancelled`,
      accountBillingCustomerRef: readString(resource, 'custom_id'),
      accountId: null,
      occurredAt: readOccurredAt(payload, resource, nowIso),
      isSandbox,
      externalSubscriptionId: subscriptionId,
      periodEnd: readString(readRecord(resource, 'billing_info') ?? {}, 'next_billing_time'),
    },
  ];
}

function mapSubscriptionExpiredEvent(
  payload: Record<string, unknown>,
  resource: Record<string, unknown>,
  isSandbox: boolean,
  nowIso: string
): NormalizedBillingEvent[] {
  const subscriptionId = readString(resource, 'id');
  if (subscriptionId === null) {
    return [];
  }
  return [
    {
      type: 'subscription_expired',
      processor: 'paypal',
      processorEventId: readString(payload, 'id') ?? `${subscriptionId}:expired`,
      accountBillingCustomerRef: readString(resource, 'custom_id'),
      accountId: null,
      occurredAt: readOccurredAt(payload, resource, nowIso),
      isSandbox,
      externalSubscriptionId: subscriptionId,
      expiredAt:
        readString(resource, 'status_update_time') ??
        readString(resource, 'update_time') ??
        readString(payload, 'event_time'),
    },
  ];
}

function mapSubscriptionRenewalFailedEvent(
  payload: Record<string, unknown>,
  resource: Record<string, unknown>,
  isSandbox: boolean,
  nowIso: string
): NormalizedBillingEvent[] {
  const subscriptionId = readString(resource, 'id') ?? readString(resource, 'billing_agreement_id');
  if (subscriptionId === null) {
    return [];
  }
  return [
    {
      type: 'subscription_renewal_failed',
      processor: 'paypal',
      processorEventId: readString(payload, 'id') ?? `${subscriptionId}:payment_failed`,
      accountBillingCustomerRef: readString(resource, 'custom_id'),
      accountId: null,
      occurredAt: readOccurredAt(payload, resource, nowIso),
      isSandbox,
      externalSubscriptionId: subscriptionId,
      periodEnd: readString(readRecord(resource, 'billing_info') ?? {}, 'next_billing_time'),
    },
  ];
}

function mapRefundOrRevokeEvent(
  payload: Record<string, unknown>,
  resource: Record<string, unknown>,
  reason: 'refund' | 'chargeback',
  isSandbox: boolean,
  nowIso: string
): NormalizedBillingEvent[] {
  const transactionId = readString(resource, 'id');
  const subscriptionId = readString(resource, 'billing_agreement_id');
  const occurredAt = readOccurredAt(payload, resource, nowIso);
  const shared = {
    type: 'refund_or_revoke' as const,
    processor: 'paypal' as const,
    accountBillingCustomerRef: readString(resource, 'custom_id'),
    accountId: null,
    occurredAt,
    isSandbox,
    reason,
    revokedAt: occurredAt,
  };

  if (transactionId !== null) {
    return [
      {
        ...shared,
        processorEventId: readString(payload, 'id') ?? `${transactionId}:${reason}`,
        externalTransactionId: transactionId,
        externalSubscriptionId: subscriptionId,
      },
    ];
  }
  if (subscriptionId !== null) {
    return [
      {
        ...shared,
        processorEventId: readString(payload, 'id') ?? `${subscriptionId}:${reason}`,
        externalTransactionId: null,
        externalSubscriptionId: subscriptionId,
      },
    ];
  }
  return [];
}

async function mapWebhookPayloadToEvents(
  payload: Record<string, unknown>,
  service: PayPalService,
  isSandbox: boolean,
  nowIso: string
): Promise<NormalizedBillingEvent[]> {
  const eventType = readString(payload, 'event_type');
  if (eventType === null) {
    return [];
  }
  const resource = readRecord(payload, 'resource');
  if (resource === null) {
    return [];
  }

  if (eventType === 'PAYMENT.CAPTURE.COMPLETED') {
    return mapCaptureCompletedEvent(payload, resource, service, isSandbox, nowIso);
  }
  if (eventType === 'PAYMENT.CAPTURE.REFUNDED') {
    return mapRefundOrRevokeEvent(payload, resource, 'refund', isSandbox, nowIso);
  }
  if (eventType === 'PAYMENT.CAPTURE.REVERSED') {
    return mapRefundOrRevokeEvent(payload, resource, 'chargeback', isSandbox, nowIso);
  }
  if (eventType === 'BILLING.SUBSCRIPTION.ACTIVATED') {
    return mapSubscriptionActivatedEvent(payload, resource, service, isSandbox, nowIso);
  }
  if (eventType === 'BILLING.SUBSCRIPTION.CANCELLED') {
    return mapSubscriptionCancelledEvent(payload, resource, isSandbox, nowIso);
  }
  if (eventType === 'BILLING.SUBSCRIPTION.EXPIRED') {
    return mapSubscriptionExpiredEvent(payload, resource, isSandbox, nowIso);
  }
  if (eventType === 'BILLING.SUBSCRIPTION.PAYMENT.FAILED') {
    return mapSubscriptionRenewalFailedEvent(payload, resource, isSandbox, nowIso);
  }
  if (
    eventType === 'BILLING.SUBSCRIPTION.PAYMENT.COMPLETED' ||
    eventType === 'PAYMENT.SALE.COMPLETED'
  ) {
    return mapSubscriptionPaymentCompletedEvent(payload, resource, service, isSandbox, nowIso);
  }
  if (eventType === 'BILLING.SUBSCRIPTION.UPDATED') {
    const status = readString(resource, 'status');
    if (status === 'ACTIVE') {
      return mapSubscriptionActivatedEvent(payload, resource, service, isSandbox, nowIso);
    }
    if (status === 'CANCELLED') {
      return mapSubscriptionCancelledEvent(payload, resource, isSandbox, nowIso);
    }
    if (status === 'EXPIRED') {
      return mapSubscriptionExpiredEvent(payload, resource, isSandbox, nowIso);
    }
    if (status === 'SUSPENDED') {
      return mapSubscriptionRenewalFailedEvent(payload, resource, isSandbox, nowIso);
    }
  }
  return [];
}

function mapCaptureToSnapshot(
  capture: Record<string, unknown>,
  ref: { externalId: string; externalProductId: string | null },
  isSandbox: boolean,
  fetchedAt: string
): NormalizedTransactionSnapshot {
  const externalProductId = ref.externalProductId;
  const externalSubscriptionId = readString(capture, 'billing_agreement_id');
  const status = readString(capture, 'status');

  return {
    processor: 'paypal',
    externalTransactionId: readString(capture, 'id') ?? ref.externalId,
    externalSubscriptionId,
    accountBillingCustomerRef: readString(capture, 'custom_id'),
    externalProductId,
    externalBasePlanId: null,
    purchaseKind: inferPurchaseKind(externalProductId, externalSubscriptionId),
    settledAt: readString(capture, 'create_time') ?? fetchedAt,
    periodStart: null,
    periodEnd: null,
    amount: readAmount(capture),
    revokedAt:
      status === 'REFUNDED' || status === 'REVERSED'
        ? (readString(capture, 'update_time') ?? readString(capture, 'create_time') ?? fetchedAt)
        : null,
    revocationReason:
      status === 'REFUNDED' ? 'refund' : status === 'REVERSED' ? 'chargeback' : null,
    isSandbox,
    fetchedAt,
    schemaVersion: 'paypal-capture-v1',
    rawPayload: capture,
  };
}

function mapSubscriptionToSnapshot(
  subscription: Record<string, unknown>,
  isSandbox: boolean,
  fetchedAt: string
): NormalizedSubscriptionSnapshot {
  const billingInfo = readRecord(subscription, 'billingInfo');
  const status = readString(subscription, 'status');
  const currentPeriodEnd =
    readString(billingInfo ?? {}, 'nextBillingTime') ??
    readString(billingInfo ?? {}, 'finalPaymentTime');

  return {
    processor: 'paypal',
    externalSubscriptionId: readString(subscription, 'id') ?? '',
    accountBillingCustomerRef: readString(subscription, 'customId'),
    externalProductId: readString(subscription, 'planId'),
    externalBasePlanId: null,
    status: mapSubscriptionStatus(status),
    purchaseKind: 'auto_renew',
    currentPeriodStart:
      readString(readRecord(billingInfo ?? {}, 'lastPayment') ?? {}, 'time') ??
      readString(subscription, 'startTime'),
    currentPeriodEnd,
    cancelAtPeriodEnd: status === 'CANCELLED',
    isSandbox,
    fetchedAt,
    schemaVersion: 'paypal-subscription-v1',
    rawPayload: subscription,
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
      subscriptionsController: config.subscriptionsController,
      webhookId: config.webhookId,
    });

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

      const events = await mapWebhookPayloadToEvents(payload, service, isSandbox, nowIso());
      return {
        schemaVersion: 'paypal-webhook-v1',
        rawPayload: payload,
        events,
      };
    },

    async fetchSubscription(ref): Promise<NormalizedSubscriptionSnapshot> {
      const subscription = await service.getSubscription(ref.externalId);
      if (subscription === null) {
        throw new BillingProcessorRecordNotFoundError('paypal', ref.externalId);
      }
      return mapSubscriptionToSnapshot(toRawPayload(subscription), isSandbox, nowIso());
    },

    async fetchTransaction(ref): Promise<NormalizedTransactionSnapshot> {
      const capture = await service.getCaptureInfo(ref.externalId);
      if (capture === null) {
        throw new BillingProcessorRecordNotFoundError('paypal', ref.externalId);
      }
      return mapCaptureToSnapshot(toRawPayload(capture), ref, isSandbox, nowIso());
    },

    async cancelAutoRenew(externalSubscriptionId) {
      await service.cancelSubscription(externalSubscriptionId);
      return { outcome: 'cancelled' };
    },
  };
}

export function resolvePayPalEnvironment(
  paypalEnvironment: PayPalEnvironment | undefined,
  nodeEnv: string | undefined
): PayPalEnvironment {
  return PayPalService.resolveEnvironment(paypalEnvironment, nodeEnv);
}
