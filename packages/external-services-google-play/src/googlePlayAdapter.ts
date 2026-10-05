import type {
  BillingAmount,
  BillingPurchaseAcknowledgement,
  BillingWebhookParseResult,
  BillingWebhookRequest,
  NormalizedBillingEvent,
  NormalizedSubscriptionSnapshot,
  NormalizedTransactionSnapshot,
  PaymentProcessorAdapter,
} from '@podverse/helpers';
import {
  BillingProcessorRecordNotFoundError,
  BillingWebhookVerificationError,
} from '@podverse/helpers';

import type { GooglePlayClient } from './PlayDeveloperClient.js';
import { PlayDeveloperClient } from './PlayDeveloperClient.js';
import { verifyAndParseRtdnPush } from './verifyRtdn.js';

const SUBSCRIPTION_NOTIFICATION_RECOVERED = 1;
const SUBSCRIPTION_NOTIFICATION_RENEWED = 2;
const SUBSCRIPTION_NOTIFICATION_CANCELED = 3;
const SUBSCRIPTION_NOTIFICATION_PURCHASED = 4;
const SUBSCRIPTION_NOTIFICATION_ON_HOLD = 5;
const SUBSCRIPTION_NOTIFICATION_IN_GRACE_PERIOD = 6;
const SUBSCRIPTION_NOTIFICATION_RESTARTED = 7;
const SUBSCRIPTION_NOTIFICATION_REVOKED = 12;
const SUBSCRIPTION_NOTIFICATION_EXPIRED = 13;

const ONE_TIME_PRODUCT_NOTIFICATION_PURCHASED = 1;
const ONE_TIME_PRODUCT_NOTIFICATION_CANCELED = 2;

interface GooglePlayAdapterConfig {
  packageName: string;
  serviceAccountJsonPath: string;
  rtdnPushAudience: string;
  rtdnPushServiceAccountEmail: string;
  client?: GooglePlayClient;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRawPayload(value: unknown): Record<string, unknown> {
  const json = JSON.stringify(value);
  const parsed: unknown = JSON.parse(json);
  return isRecord(parsed) ? parsed : {};
}

function readString(record: Record<string, unknown>, key: string): string | null {
  const value = Reflect.get(record, key);
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function readNumber(record: Record<string, unknown>, key: string): number | null {
  const value = Reflect.get(record, key);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.length > 0) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }
  return null;
}

function readBoolean(record: Record<string, unknown>, key: string): boolean | null {
  const value = Reflect.get(record, key);
  return typeof value === 'boolean' ? value : null;
}

function readRecord(record: Record<string, unknown>, key: string): Record<string, unknown> | null {
  const value = Reflect.get(record, key);
  return isRecord(value) ? value : null;
}

function readArray(record: Record<string, unknown>, key: string): unknown[] {
  const value = Reflect.get(record, key);
  return Array.isArray(value) ? value : [];
}

function toIsoFromMillisString(value: string | null): string | null {
  if (value === null) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function normalizeMoney(units: string | null, nanos: number | null): string | null {
  if (units === null && nanos === null) {
    return null;
  }
  const unitsNumber = units === null ? 0 : Number(units);
  if (!Number.isFinite(unitsNumber)) {
    return null;
  }
  const nanosNumber = nanos ?? 0;
  if (!Number.isFinite(nanosNumber)) {
    return null;
  }
  const sign = unitsNumber < 0 || nanosNumber < 0 ? '-' : '';
  const absoluteUnits = Math.abs(Math.trunc(unitsNumber));
  const absoluteNanos = Math.abs(Math.trunc(nanosNumber));
  const fractional = String(absoluteNanos).padStart(9, '0').replace(/0+$/, '');
  if (fractional.length === 0) {
    return `${sign}${absoluteUnits}`;
  }
  return `${sign}${absoluteUnits}.${fractional}`;
}

function amountFromPriceRecord(price: Record<string, unknown> | null): BillingAmount | null {
  if (price === null) {
    return null;
  }
  const currencyCode = readString(price, 'currencyCode');
  if (currencyCode === null) {
    return null;
  }
  const value = normalizeMoney(readString(price, 'units'), readNumber(price, 'nanos'));
  if (value === null) {
    return null;
  }
  return { value, currencyCode };
}

function amountFromMicros(
  priceMicros: string | null,
  currencyCode: string | null
): BillingAmount | null {
  if (priceMicros === null || currencyCode === null) {
    return null;
  }
  const micros = Number(priceMicros);
  if (!Number.isFinite(micros)) {
    return null;
  }
  const sign = micros < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(micros));
  const whole = Math.floor(absolute / 1_000_000);
  const fractional = String(absolute % 1_000_000)
    .padStart(6, '0')
    .replace(/0+$/, '');
  const value = fractional.length > 0 ? `${sign}${whole}.${fractional}` : `${sign}${whole}`;
  return { value, currencyCode };
}

function parseOccurredAt(notification: Record<string, unknown>, fallbackIso: string): string {
  return toIsoFromMillisString(readString(notification, 'eventTimeMillis')) ?? fallbackIso;
}

function parseSubscriptionStateToStatus(
  state: string | null,
  autoRenewEnabled: boolean | null
): NormalizedSubscriptionSnapshot['status'] {
  if (state === 'SUBSCRIPTION_STATE_ACTIVE') {
    return autoRenewEnabled === false ? 'cancelled_active' : 'active';
  }
  if (state === 'SUBSCRIPTION_STATE_IN_GRACE_PERIOD') {
    return 'in_grace_period';
  }
  if (state === 'SUBSCRIPTION_STATE_ON_HOLD' || state === 'SUBSCRIPTION_STATE_PAUSED') {
    return 'past_due';
  }
  if (state === 'SUBSCRIPTION_STATE_CANCELED') {
    return 'cancelled_active';
  }
  if (state === 'SUBSCRIPTION_STATE_EXPIRED') {
    return 'expired';
  }
  return 'pending';
}

function isSandboxSubscriptionPurchase(purchase: Record<string, unknown>): boolean {
  return readRecord(purchase, 'testPurchase') !== null;
}

function isSandboxProductPurchase(productPurchase: Record<string, unknown>): boolean {
  const purchaseType = readNumber(productPurchase, 'purchaseType');
  return purchaseType === 0;
}

function selectLatestLineItem(purchase: Record<string, unknown>): Record<string, unknown> | null {
  const lineItems = readArray(purchase, 'lineItems').filter(
    (item): item is Record<string, unknown> => isRecord(item)
  );
  if (lineItems.length === 0) {
    return null;
  }
  return (
    lineItems.slice().sort((left, right) => {
      const leftExpiry = Date.parse(readString(left, 'expiryTime') ?? '');
      const rightExpiry = Date.parse(readString(right, 'expiryTime') ?? '');
      if (Number.isNaN(leftExpiry) && Number.isNaN(rightExpiry)) {
        return 0;
      }
      if (Number.isNaN(leftExpiry)) {
        return 1;
      }
      if (Number.isNaN(rightExpiry)) {
        return -1;
      }
      return rightExpiry - leftExpiry;
    })[0] ?? null
  );
}

interface SubscriptionContext {
  accountBillingCustomerRef: string | null;
  externalProductId: string | null;
  externalBasePlanId: string | null;
  purchaseKind: 'one_time' | 'auto_renew';
  periodStart: string | null;
  periodEnd: string | null;
  externalTransactionId: string | null;
  autoRenewEnabled: boolean | null;
  linkedPurchaseToken: string | null;
  isSandbox: boolean;
  rawLineItem: Record<string, unknown> | null;
}

function readSubscriptionContext(
  purchase: Record<string, unknown>,
  fallbackProductId: string | null
): SubscriptionContext {
  const lineItem = selectLatestLineItem(purchase);
  const accountIdentifiers = readRecord(purchase, 'externalAccountIdentifiers');
  const offerDetails = lineItem === null ? null : readRecord(lineItem, 'offerDetails');
  const autoRenewingPlan = lineItem === null ? null : readRecord(lineItem, 'autoRenewingPlan');
  const prepaidPlan = lineItem === null ? null : readRecord(lineItem, 'prepaidPlan');
  return {
    accountBillingCustomerRef:
      (accountIdentifiers === null
        ? null
        : readString(accountIdentifiers, 'obfuscatedExternalAccountId')) ??
      readString(purchase, 'obfuscatedExternalAccountId'),
    externalProductId:
      (lineItem === null ? null : readString(lineItem, 'productId')) ?? fallbackProductId,
    externalBasePlanId:
      (offerDetails === null ? null : readString(offerDetails, 'basePlanId')) ??
      (autoRenewingPlan === null ? null : readString(autoRenewingPlan, 'basePlanId')),
    purchaseKind: prepaidPlan === null ? 'auto_renew' : 'one_time',
    periodStart: lineItem === null ? null : readString(lineItem, 'startTime'),
    periodEnd: lineItem === null ? null : readString(lineItem, 'expiryTime'),
    externalTransactionId:
      (lineItem === null ? null : readString(lineItem, 'latestSuccessfulOrderId')) ??
      readString(purchase, 'latestOrderId'),
    autoRenewEnabled:
      autoRenewingPlan === null ? null : readBoolean(autoRenewingPlan, 'autoRenewEnabled'),
    linkedPurchaseToken: readString(purchase, 'linkedPurchaseToken'),
    isSandbox: isSandboxSubscriptionPurchase(purchase),
    rawLineItem: lineItem,
  };
}

function mapSubscriptionAmount(context: SubscriptionContext): BillingAmount | null {
  if (context.rawLineItem === null) {
    return null;
  }
  const autoRenewingPlan = readRecord(context.rawLineItem, 'autoRenewingPlan');
  if (autoRenewingPlan !== null) {
    return amountFromPriceRecord(readRecord(autoRenewingPlan, 'recurringPrice'));
  }
  const prepaidPlan = readRecord(context.rawLineItem, 'prepaidPlan');
  if (prepaidPlan !== null) {
    return amountFromPriceRecord(readRecord(prepaidPlan, 'price'));
  }
  return null;
}

function buildEventId(messageId: string, suffix: string): string {
  return `${messageId}:${suffix}`;
}

function parseNotificationType(record: Record<string, unknown>): number | null {
  return readNumber(record, 'notificationType');
}

async function mapSubscriptionNotificationEvents(
  messageId: string,
  occurredAt: string,
  subscriptionNotification: Record<string, unknown>,
  client: GooglePlayClient
): Promise<NormalizedBillingEvent[]> {
  const purchaseToken = readString(subscriptionNotification, 'purchaseToken');
  if (purchaseToken === null) {
    return [];
  }
  const fallbackProductId = readString(subscriptionNotification, 'subscriptionId');
  const purchase = await client.getSubscriptionPurchase(purchaseToken);
  if (purchase === null) {
    return [];
  }

  const context = readSubscriptionContext(purchase, fallbackProductId);
  const notificationType = parseNotificationType(subscriptionNotification);
  const events: NormalizedBillingEvent[] = [];

  if (notificationType === SUBSCRIPTION_NOTIFICATION_PURCHASED) {
    if (
      context.externalTransactionId !== null &&
      context.periodStart !== null &&
      context.periodEnd !== null
    ) {
      events.push({
        type: 'payment_settled',
        processor: 'google_play',
        processorEventId: buildEventId(messageId, 'subscription_purchased'),
        accountBillingCustomerRef: context.accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox: context.isSandbox,
        purchaseKind: context.purchaseKind,
        externalTransactionId: context.externalTransactionId,
        externalSubscriptionId: purchaseToken,
        externalProductId: context.externalProductId,
        externalBasePlanId: context.externalBasePlanId,
        periodStart: context.periodStart,
        periodEnd: context.periodEnd,
        amount: mapSubscriptionAmount(context),
      });
    } else {
      events.push({
        type: 'subscription_activated',
        processor: 'google_play',
        processorEventId: buildEventId(messageId, 'subscription_activated'),
        accountBillingCustomerRef: context.accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox: context.isSandbox,
        externalSubscriptionId: purchaseToken,
        externalProductId: context.externalProductId,
        externalBasePlanId: context.externalBasePlanId,
        periodStart: context.periodStart,
        periodEnd: context.periodEnd,
      });
    }
    if (
      context.linkedPurchaseToken !== null &&
      context.linkedPurchaseToken.length > 0 &&
      context.linkedPurchaseToken !== purchaseToken
    ) {
      events.push({
        type: 'subscription_expired',
        processor: 'google_play',
        processorEventId: buildEventId(messageId, `superseded_${context.linkedPurchaseToken}`),
        accountBillingCustomerRef: context.accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox: context.isSandbox,
        externalSubscriptionId: context.linkedPurchaseToken,
        expiredAt: context.periodStart ?? occurredAt,
      });
    }
    return events;
  }

  if (
    notificationType === SUBSCRIPTION_NOTIFICATION_RENEWED &&
    context.externalTransactionId !== null &&
    context.periodStart !== null &&
    context.periodEnd !== null
  ) {
    events.push({
      type: 'subscription_renewed',
      processor: 'google_play',
      processorEventId: buildEventId(messageId, 'subscription_renewed'),
      accountBillingCustomerRef: context.accountBillingCustomerRef,
      accountId: null,
      occurredAt,
      isSandbox: context.isSandbox,
      externalSubscriptionId: purchaseToken,
      externalProductId: context.externalProductId,
      externalBasePlanId: context.externalBasePlanId,
      externalTransactionId: context.externalTransactionId,
      periodStart: context.periodStart,
      periodEnd: context.periodEnd,
      amount: mapSubscriptionAmount(context),
    });
    return events;
  }

  if (notificationType === SUBSCRIPTION_NOTIFICATION_RESTARTED) {
    events.push({
      type: 'subscription_activated',
      processor: 'google_play',
      processorEventId: buildEventId(messageId, 'subscription_restarted'),
      accountBillingCustomerRef: context.accountBillingCustomerRef,
      accountId: null,
      occurredAt,
      isSandbox: context.isSandbox,
      externalSubscriptionId: purchaseToken,
      externalProductId: context.externalProductId,
      externalBasePlanId: context.externalBasePlanId,
      periodStart: context.periodStart,
      periodEnd: context.periodEnd,
    });
    return events;
  }

  if (notificationType === SUBSCRIPTION_NOTIFICATION_RECOVERED) {
    events.push({
      type: 'grace_exited',
      processor: 'google_play',
      processorEventId: buildEventId(messageId, 'grace_recovered'),
      accountBillingCustomerRef: context.accountBillingCustomerRef,
      accountId: null,
      occurredAt,
      isSandbox: context.isSandbox,
      externalSubscriptionId: purchaseToken,
      outcome: 'recovered',
    });
    return events;
  }

  if (notificationType === SUBSCRIPTION_NOTIFICATION_IN_GRACE_PERIOD) {
    events.push({
      type: 'grace_entered',
      processor: 'google_play',
      processorEventId: buildEventId(messageId, 'grace_entered'),
      accountBillingCustomerRef: context.accountBillingCustomerRef,
      accountId: null,
      occurredAt,
      isSandbox: context.isSandbox,
      externalSubscriptionId: purchaseToken,
      periodEnd: context.periodEnd,
      processorGracePeriodEndsAt: context.periodEnd,
    });
    return events;
  }

  if (notificationType === SUBSCRIPTION_NOTIFICATION_ON_HOLD) {
    events.push({
      type: 'grace_exited',
      processor: 'google_play',
      processorEventId: buildEventId(messageId, 'grace_lapsed'),
      accountBillingCustomerRef: context.accountBillingCustomerRef,
      accountId: null,
      occurredAt,
      isSandbox: context.isSandbox,
      externalSubscriptionId: purchaseToken,
      outcome: 'lapsed',
    });
    return events;
  }

  if (notificationType === SUBSCRIPTION_NOTIFICATION_CANCELED) {
    events.push({
      type: 'subscription_cancelled',
      processor: 'google_play',
      processorEventId: buildEventId(messageId, 'subscription_cancelled'),
      accountBillingCustomerRef: context.accountBillingCustomerRef,
      accountId: null,
      occurredAt,
      isSandbox: context.isSandbox,
      externalSubscriptionId: purchaseToken,
      periodEnd: context.periodEnd,
    });
    return events;
  }

  if (notificationType === SUBSCRIPTION_NOTIFICATION_REVOKED) {
    events.push({
      type: 'refund_or_revoke',
      processor: 'google_play',
      processorEventId: buildEventId(messageId, 'subscription_revoked'),
      accountBillingCustomerRef: context.accountBillingCustomerRef,
      accountId: null,
      occurredAt,
      isSandbox: context.isSandbox,
      reason: 'store_revoke',
      revokedAt: occurredAt,
      externalTransactionId: context.externalTransactionId,
      externalSubscriptionId: purchaseToken,
    });
    return events;
  }

  if (notificationType === SUBSCRIPTION_NOTIFICATION_EXPIRED) {
    events.push({
      type: 'subscription_expired',
      processor: 'google_play',
      processorEventId: buildEventId(messageId, 'subscription_expired'),
      accountBillingCustomerRef: context.accountBillingCustomerRef,
      accountId: null,
      occurredAt,
      isSandbox: context.isSandbox,
      externalSubscriptionId: purchaseToken,
      expiredAt: context.periodEnd ?? occurredAt,
    });
    return events;
  }

  return [];
}

async function mapOneTimeProductNotificationEvents(
  messageId: string,
  occurredAt: string,
  oneTimeNotification: Record<string, unknown>,
  client: GooglePlayClient
): Promise<NormalizedBillingEvent[]> {
  const sku = readString(oneTimeNotification, 'sku');
  const purchaseToken = readString(oneTimeNotification, 'purchaseToken');
  if (sku === null || purchaseToken === null) {
    return [];
  }

  const productPurchase = await client.getProductPurchase(sku, purchaseToken);
  if (productPurchase === null) {
    return [];
  }

  const accountBillingCustomerRef = readString(productPurchase, 'obfuscatedExternalAccountId');
  const externalTransactionId = readString(productPurchase, 'orderId') ?? purchaseToken;
  const amount = amountFromMicros(
    readString(productPurchase, 'priceAmountMicros'),
    readString(productPurchase, 'priceCurrencyCode')
  );
  const isSandbox = isSandboxProductPurchase(productPurchase);
  const notificationType = parseNotificationType(oneTimeNotification);

  if (notificationType === ONE_TIME_PRODUCT_NOTIFICATION_PURCHASED) {
    return [
      {
        type: 'payment_settled',
        processor: 'google_play',
        processorEventId: buildEventId(messageId, 'one_time_purchased'),
        accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox,
        purchaseKind: 'one_time',
        externalTransactionId,
        externalSubscriptionId: null,
        externalProductId: sku,
        externalBasePlanId: null,
        periodStart: null,
        periodEnd: null,
        amount,
      },
    ];
  }

  if (notificationType === ONE_TIME_PRODUCT_NOTIFICATION_CANCELED) {
    return [
      {
        type: 'refund_or_revoke',
        processor: 'google_play',
        processorEventId: buildEventId(messageId, 'one_time_cancelled'),
        accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox,
        reason: 'refund',
        revokedAt: occurredAt,
        externalTransactionId,
        externalSubscriptionId: null,
      },
    ];
  }

  return [];
}

async function mapVoidedNotificationEvents(
  messageId: string,
  occurredAt: string,
  voidedNotification: Record<string, unknown>,
  client: GooglePlayClient
): Promise<NormalizedBillingEvent[]> {
  const purchaseToken = readString(voidedNotification, 'purchaseToken');
  const orderId = readString(voidedNotification, 'orderId');
  const refundType = readNumber(voidedNotification, 'refundType');
  const productType = readNumber(voidedNotification, 'productType');
  const isSubscription = productType === 1;

  let accountBillingCustomerRef: string | null = null;
  let isSandbox = false;
  if (isSubscription && purchaseToken !== null) {
    const purchase = await client.getSubscriptionPurchase(purchaseToken);
    if (purchase !== null) {
      const context = readSubscriptionContext(purchase, null);
      accountBillingCustomerRef = context.accountBillingCustomerRef;
      isSandbox = context.isSandbox;
    }
  }

  const externalSubscriptionId = isSubscription ? purchaseToken : null;
  const externalTransactionId = orderId;
  if (externalSubscriptionId === null && externalTransactionId === null) {
    return [];
  }
  if (externalTransactionId !== null) {
    return [
      {
        type: 'refund_or_revoke',
        processor: 'google_play',
        processorEventId: buildEventId(messageId, 'voided_purchase'),
        accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox,
        reason: refundType === 2 ? 'chargeback' : 'refund',
        revokedAt: occurredAt,
        externalTransactionId,
        externalSubscriptionId,
      },
    ];
  }
  if (externalSubscriptionId === null) {
    return [];
  }

  return [
    {
      type: 'refund_or_revoke',
      processor: 'google_play',
      processorEventId: buildEventId(messageId, 'voided_purchase'),
      accountBillingCustomerRef,
      accountId: null,
      occurredAt,
      isSandbox,
      reason: refundType === 2 ? 'chargeback' : 'refund',
      revokedAt: occurredAt,
      externalTransactionId: null,
      externalSubscriptionId,
    },
  ];
}

function mapSubscriptionSnapshot(
  purchaseToken: string,
  fetchedAt: string,
  purchase: Record<string, unknown>,
  fallbackProductId: string | null
): NormalizedSubscriptionSnapshot {
  const context = readSubscriptionContext(purchase, fallbackProductId);
  const state = readString(purchase, 'subscriptionState');
  const status = parseSubscriptionStateToStatus(state, context.autoRenewEnabled);
  return {
    processor: 'google_play',
    externalSubscriptionId: purchaseToken,
    accountBillingCustomerRef: context.accountBillingCustomerRef,
    externalProductId: context.externalProductId,
    externalBasePlanId: context.externalBasePlanId,
    status,
    purchaseKind: context.purchaseKind,
    currentPeriodStart: context.periodStart,
    currentPeriodEnd: context.periodEnd,
    cancelAtPeriodEnd:
      context.autoRenewEnabled === false || state === 'SUBSCRIPTION_STATE_CANCELED',
    isSandbox: context.isSandbox,
    fetchedAt,
    schemaVersion: 'google-play-subscription-v2',
    rawPayload: purchase,
  };
}

function mapSubscriptionTransactionSnapshot(
  purchaseToken: string,
  fetchedAt: string,
  purchase: Record<string, unknown>,
  fallbackProductId: string | null
): NormalizedTransactionSnapshot {
  const context = readSubscriptionContext(purchase, fallbackProductId);
  return {
    processor: 'google_play',
    externalTransactionId: context.externalTransactionId ?? purchaseToken,
    externalSubscriptionId: purchaseToken,
    accountBillingCustomerRef: context.accountBillingCustomerRef,
    externalProductId: context.externalProductId,
    externalBasePlanId: context.externalBasePlanId,
    purchaseKind: context.purchaseKind,
    settledAt: context.periodStart ?? fetchedAt,
    periodStart: context.periodStart,
    periodEnd: context.periodEnd,
    amount: mapSubscriptionAmount(context),
    revokedAt: null,
    revocationReason: null,
    isSandbox: context.isSandbox,
    fetchedAt,
    schemaVersion: 'google-play-subscription-v2',
    rawPayload: purchase,
  };
}

function mapProductTransactionSnapshot(
  purchaseToken: string,
  fetchedAt: string,
  productPurchase: Record<string, unknown>,
  externalProductId: string
): NormalizedTransactionSnapshot {
  return {
    processor: 'google_play',
    externalTransactionId: readString(productPurchase, 'orderId') ?? purchaseToken,
    externalSubscriptionId: null,
    accountBillingCustomerRef: readString(productPurchase, 'obfuscatedExternalAccountId'),
    externalProductId,
    externalBasePlanId: null,
    purchaseKind: 'one_time',
    settledAt:
      toIsoFromMillisString(readString(productPurchase, 'purchaseTimeMillis')) ?? fetchedAt,
    periodStart: null,
    periodEnd: null,
    amount: amountFromMicros(
      readString(productPurchase, 'priceAmountMicros'),
      readString(productPurchase, 'priceCurrencyCode')
    ),
    revokedAt: null,
    revocationReason: null,
    isSandbox: isSandboxProductPurchase(productPurchase),
    fetchedAt,
    schemaVersion: 'google-play-product-v1',
    rawPayload: productPurchase,
  };
}

function isSubscriptionAcknowledgementPending(purchase: Record<string, unknown>): boolean {
  const state = readString(purchase, 'acknowledgementState');
  if (state === null) {
    const numericState = readNumber(purchase, 'acknowledgementState');
    return numericState === 0;
  }
  return state === 'ACKNOWLEDGEMENT_STATE_PENDING';
}

function isProductAcknowledgementPending(productPurchase: Record<string, unknown>): boolean {
  const state = readNumber(productPurchase, 'acknowledgementState');
  return state === 0;
}

function resolveSubscriptionProductId(
  purchase: Record<string, unknown>,
  fallbackProductId: string
): string {
  const context = readSubscriptionContext(purchase, fallbackProductId);
  return context.externalProductId ?? fallbackProductId;
}

export function createGooglePlayAdapter(config: GooglePlayAdapterConfig): PaymentProcessorAdapter {
  const client =
    config.client ??
    new PlayDeveloperClient({
      packageName: config.packageName,
      serviceAccountJsonPath: config.serviceAccountJsonPath,
    });
  const nowIso = (): string => new Date().toISOString();

  return {
    id: 'google_play',

    async verifyAndParseWebhook(
      request: BillingWebhookRequest
    ): Promise<BillingWebhookParseResult> {
      let parsedPush;
      try {
        parsedPush = await verifyAndParseRtdnPush({
          request,
          idTokenVerifier: client.getIdTokenVerifier(),
          expectedAudience: config.rtdnPushAudience,
          expectedServiceAccountEmail: config.rtdnPushServiceAccountEmail,
          expectedPackageName: config.packageName,
        });
      } catch (error) {
        if (error instanceof BillingWebhookVerificationError) {
          throw error;
        }
        throw new BillingWebhookVerificationError(
          'google_play',
          error instanceof Error ? error.message : String(error)
        );
      }

      const occurredAt = parseOccurredAt(parsedPush.developerNotification, nowIso());
      const events: NormalizedBillingEvent[] = [];
      const subscriptionNotification = readRecord(
        parsedPush.developerNotification,
        'subscriptionNotification'
      );
      const oneTimeProductNotification = readRecord(
        parsedPush.developerNotification,
        'oneTimeProductNotification'
      );
      const voidedPurchaseNotification = readRecord(
        parsedPush.developerNotification,
        'voidedPurchaseNotification'
      );

      if (subscriptionNotification !== null) {
        events.push(
          ...(await mapSubscriptionNotificationEvents(
            parsedPush.messageId,
            occurredAt,
            subscriptionNotification,
            client
          ))
        );
      }
      if (oneTimeProductNotification !== null) {
        events.push(
          ...(await mapOneTimeProductNotificationEvents(
            parsedPush.messageId,
            occurredAt,
            oneTimeProductNotification,
            client
          ))
        );
      }
      if (voidedPurchaseNotification !== null) {
        events.push(
          ...(await mapVoidedNotificationEvents(
            parsedPush.messageId,
            occurredAt,
            voidedPurchaseNotification,
            client
          ))
        );
      }

      return {
        schemaVersion: 'google-play-rtdn-v1',
        rawPayload: toRawPayload({
          requestEnvelope: parsedPush.requestEnvelope,
          messageEnvelope: parsedPush.messageEnvelope,
          developerNotification: parsedPush.developerNotification,
        }),
        events,
      };
    },

    async fetchSubscription(ref): Promise<NormalizedSubscriptionSnapshot> {
      const purchase = await client.getSubscriptionPurchase(ref.externalId);
      if (purchase === null) {
        throw new BillingProcessorRecordNotFoundError('google_play', ref.externalId);
      }
      return mapSubscriptionSnapshot(ref.externalId, nowIso(), purchase, ref.externalProductId);
    },

    async fetchTransaction(ref): Promise<NormalizedTransactionSnapshot> {
      const fetchedAt = nowIso();
      const subscriptionPurchase = await client.getSubscriptionPurchase(ref.externalId);
      if (subscriptionPurchase !== null) {
        return mapSubscriptionTransactionSnapshot(
          ref.externalId,
          fetchedAt,
          subscriptionPurchase,
          ref.externalProductId
        );
      }
      if (ref.externalProductId === null) {
        throw new BillingProcessorRecordNotFoundError('google_play', ref.externalId);
      }
      const productPurchase = await client.getProductPurchase(
        ref.externalProductId,
        ref.externalId
      );
      if (productPurchase === null) {
        throw new BillingProcessorRecordNotFoundError('google_play', ref.externalId);
      }
      return mapProductTransactionSnapshot(
        ref.externalId,
        fetchedAt,
        productPurchase,
        ref.externalProductId
      );
    },

    async acknowledgePurchase(acknowledgement: BillingPurchaseAcknowledgement): Promise<void> {
      const subscriptionPurchase = await client.getSubscriptionPurchase(
        acknowledgement.purchaseToken
      );
      if (subscriptionPurchase !== null) {
        if (isSubscriptionAcknowledgementPending(subscriptionPurchase)) {
          const subscriptionId = resolveSubscriptionProductId(
            subscriptionPurchase,
            acknowledgement.externalProductId
          );
          await client.acknowledgeSubscriptionPurchase(
            subscriptionId,
            acknowledgement.purchaseToken
          );
        }
        return;
      }

      const productPurchase = await client.getProductPurchase(
        acknowledgement.externalProductId,
        acknowledgement.purchaseToken
      );
      if (productPurchase === null) {
        throw new BillingProcessorRecordNotFoundError('google_play', acknowledgement.purchaseToken);
      }
      if (isProductAcknowledgementPending(productPurchase)) {
        await client.acknowledgeProductPurchase(
          acknowledgement.externalProductId,
          acknowledgement.purchaseToken
        );
      }
    },

    async cancelAutoRenew(_externalSubscriptionId) {
      return { outcome: 'manage_in_store' };
    },
  };
}
