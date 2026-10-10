import type {
  BillingAmount,
  BillingPurchaseAcknowledgement,
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

import type { GooglePlayClient } from './PlayDeveloperClient.js';
import { PlayDeveloperClient } from './PlayDeveloperClient.js';
import { verifyAndParseRtdnPush } from './verifyRtdn.js';

const SUBSCRIPTION_NOTIFICATION_PURCHASED = 4;
const SUBSCRIPTION_NOTIFICATION_REVOKED = 12;

const ONE_TIME_PRODUCT_NOTIFICATION_PURCHASED = 1;
const ONE_TIME_PRODUCT_NOTIFICATION_CANCELED = 2;

interface SoldBillingProduct {
  externalProductId: string;
  externalBasePlanId: string | null;
}

interface GooglePlayAdapterConfig {
  packageName: string;
  serviceAccountJsonPath: string;
  rtdnPushAudience: string;
  rtdnPushServiceAccountEmail: string;
  client?: GooglePlayClient;
  /**
   * Product ids this deployment sells. When omitted, the ids come from the billing product env.
   * An empty list means no Play product is mapped, so notifications produce no events.
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
    (product) => product.processor === 'google_play'
  );
}

function isSoldProduct(
  products: readonly SoldBillingProduct[],
  externalProductId: string | null,
  externalBasePlanId: string | null
): boolean {
  if (externalProductId === null || externalProductId === '') {
    return false;
  }
  return products.some((product) => {
    if (product.externalProductId !== externalProductId) {
      return false;
    }
    if (product.externalBasePlanId === null) {
      return externalBasePlanId === null;
    }
    return product.externalBasePlanId === externalBasePlanId;
  });
}

function logUnmappedBillingProduct(productId: string | null, notificationType: string): void {
  // An authentic notification for a product this deployment does not sell is ignored.
  // eslint-disable-next-line no-console -- info is the level for a skipped notification
  console.info(
    `Billing notification ignored for an unmapped product processor=google_play productId=${productId ?? ''} notificationType=${notificationType}`
  );
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

/**
 * A line item Play bills again on its own is not sold here. Prepaid line items are.
 */
function lineItemIsPrepaid(lineItem: Record<string, unknown> | null): boolean {
  if (lineItem === null) {
    return false;
  }
  if (
    readRecord(lineItem, 'autoRenewingPlan') !== null &&
    readRecord(lineItem, 'prepaidPlan') === null
  ) {
    return false;
  }
  return readRecord(lineItem, 'prepaidPlan') !== null;
}

interface SubscriptionContext {
  accountBillingCustomerRef: string | null;
  externalProductId: string | null;
  externalBasePlanId: string | null;
  periodStart: string | null;
  periodEnd: string | null;
  externalTransactionId: string | null;
  isPrepaid: boolean;
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
  return {
    accountBillingCustomerRef:
      (accountIdentifiers === null
        ? null
        : readString(accountIdentifiers, 'obfuscatedExternalAccountId')) ??
      readString(purchase, 'obfuscatedExternalAccountId'),
    externalProductId:
      (lineItem === null ? null : readString(lineItem, 'productId')) ?? fallbackProductId,
    externalBasePlanId: offerDetails === null ? null : readString(offerDetails, 'basePlanId'),
    periodStart: lineItem === null ? null : readString(lineItem, 'startTime'),
    periodEnd: lineItem === null ? null : readString(lineItem, 'expiryTime'),
    externalTransactionId:
      lineItem === null ? null : readString(lineItem, 'latestSuccessfulOrderId'),
    isPrepaid: lineItemIsPrepaid(lineItem),
    isSandbox: isSandboxSubscriptionPurchase(purchase),
    rawLineItem: lineItem,
  };
}

function mapPrepaidAmount(context: SubscriptionContext): BillingAmount | null {
  if (context.rawLineItem === null) {
    return null;
  }
  const prepaidPlan = readRecord(context.rawLineItem, 'prepaidPlan');
  if (prepaidPlan === null) {
    return null;
  }
  return amountFromPriceRecord(readRecord(prepaidPlan, 'price'));
}

function buildEventId(messageId: string, suffix: string): string {
  return `${messageId}:${suffix}`;
}

function parseNotificationType(record: Record<string, unknown>): number | null {
  return readNumber(record, 'notificationType');
}

function isMappedPrepaid(
  context: SubscriptionContext,
  soldProducts: readonly SoldBillingProduct[],
  notificationType: string
): boolean {
  if (!context.isPrepaid) {
    logUnmappedBillingProduct(context.externalProductId, notificationType);
    return false;
  }
  if (!isSoldProduct(soldProducts, context.externalProductId, context.externalBasePlanId)) {
    logUnmappedBillingProduct(context.externalProductId, notificationType);
    return false;
  }
  return context.externalTransactionId !== null;
}

async function mapSubscriptionNotificationEvents(
  messageId: string,
  occurredAt: string,
  subscriptionNotification: Record<string, unknown>,
  client: GooglePlayClient,
  soldProducts: readonly SoldBillingProduct[]
): Promise<NormalizedBillingEvent[]> {
  const purchaseToken = readString(subscriptionNotification, 'purchaseToken');
  if (purchaseToken === null) {
    return [];
  }
  const notificationType = parseNotificationType(subscriptionNotification);
  if (
    notificationType !== SUBSCRIPTION_NOTIFICATION_PURCHASED &&
    notificationType !== SUBSCRIPTION_NOTIFICATION_REVOKED
  ) {
    return [];
  }

  const fallbackProductId = readString(subscriptionNotification, 'subscriptionId');
  const purchase = await client.getSubscriptionPurchase(purchaseToken);
  if (purchase === null) {
    return [];
  }

  const context = readSubscriptionContext(purchase, fallbackProductId);
  const notificationLabel = String(notificationType);
  if (!isMappedPrepaid(context, soldProducts, notificationLabel)) {
    return [];
  }
  const externalTransactionId = context.externalTransactionId;
  if (externalTransactionId === null) {
    return [];
  }

  if (notificationType === SUBSCRIPTION_NOTIFICATION_PURCHASED) {
    if (isSubscriptionAcknowledgementPending(purchase)) {
      const productId = context.externalProductId ?? fallbackProductId;
      if (productId !== null) {
        await client.acknowledgeSubscriptionPurchase(productId, purchaseToken);
      }
    }
    return [
      {
        type: 'payment_settled',
        processor: 'google_play',
        processorEventId: buildEventId(messageId, 'purchased'),
        accountBillingCustomerRef: context.accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox: context.isSandbox,
        externalTransactionId,
        externalProductId: context.externalProductId,
        externalBasePlanId: context.externalBasePlanId,
        periodStart: context.periodStart,
        periodEnd: context.periodEnd,
        amount: mapPrepaidAmount(context),
      },
    ];
  }

  return [
    {
      type: 'refund_or_revoke',
      processor: 'google_play',
      processorEventId: buildEventId(messageId, 'revoked'),
      accountBillingCustomerRef: context.accountBillingCustomerRef,
      accountId: null,
      occurredAt,
      isSandbox: context.isSandbox,
      reason: 'store_revoke',
      revokedAt: occurredAt,
      externalTransactionId,
    },
  ];
}

async function mapOneTimeProductNotificationEvents(
  messageId: string,
  occurredAt: string,
  oneTimeNotification: Record<string, unknown>,
  client: GooglePlayClient,
  soldProducts: readonly SoldBillingProduct[]
): Promise<NormalizedBillingEvent[]> {
  const sku = readString(oneTimeNotification, 'sku');
  const purchaseToken = readString(oneTimeNotification, 'purchaseToken');
  if (sku === null || purchaseToken === null) {
    return [];
  }

  const notificationType = parseNotificationType(oneTimeNotification);
  const notificationLabel =
    notificationType === null ? 'one_time' : `one_time:${String(notificationType)}`;
  if (!isSoldProduct(soldProducts, sku, null)) {
    logUnmappedBillingProduct(sku, notificationLabel);
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
        externalTransactionId,
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
  if (isSubscription && orderId === null) {
    return [];
  }

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

  const externalTransactionId = orderId ?? purchaseToken;
  if (externalTransactionId === null) {
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
      externalTransactionId,
    },
  ];
}

function mapSubscriptionTransactionSnapshot(
  fetchedAt: string,
  purchase: Record<string, unknown>,
  fallbackProductId: string | null
): NormalizedTransactionSnapshot | null {
  const context = readSubscriptionContext(purchase, fallbackProductId);
  if (context.externalTransactionId === null) {
    return null;
  }
  return {
    processor: 'google_play',
    externalTransactionId: context.externalTransactionId,
    accountBillingCustomerRef: context.accountBillingCustomerRef,
    externalProductId: context.externalProductId,
    externalBasePlanId: context.externalBasePlanId,
    settledAt: context.periodStart ?? fetchedAt,
    periodStart: context.periodStart,
    periodEnd: context.periodEnd,
    amount: mapPrepaidAmount(context),
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
    accountBillingCustomerRef: readString(productPurchase, 'obfuscatedExternalAccountId'),
    externalProductId,
    externalBasePlanId: null,
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

function orderIdMatchesCaller(callerOrderId: string | null | undefined, orderId: string): boolean {
  return callerOrderId === undefined || callerOrderId === null || callerOrderId === orderId;
}

export function createGooglePlayAdapter(config: GooglePlayAdapterConfig): PaymentProcessorAdapter {
  const client =
    config.client ??
    new PlayDeveloperClient({
      packageName: config.packageName,
      serviceAccountJsonPath: config.serviceAccountJsonPath,
    });
  const soldProducts = loadSoldProducts(config.soldProducts);
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
            client,
            soldProducts
          ))
        );
      }
      if (oneTimeProductNotification !== null) {
        events.push(
          ...(await mapOneTimeProductNotificationEvents(
            parsedPush.messageId,
            occurredAt,
            oneTimeProductNotification,
            client,
            soldProducts
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

    async fetchTransaction(ref): Promise<NormalizedTransactionSnapshot> {
      const fetchedAt = nowIso();
      const subscriptionPurchase = await client.getSubscriptionPurchase(ref.externalId);
      if (subscriptionPurchase !== null) {
        const context = readSubscriptionContext(subscriptionPurchase, ref.externalProductId);
        if (!isMappedPrepaid(context, soldProducts, 'fetchTransaction')) {
          throw new BillingProcessorRecordNotFoundError('google_play', ref.externalId);
        }
        const snapshot = mapSubscriptionTransactionSnapshot(
          fetchedAt,
          subscriptionPurchase,
          ref.externalProductId
        );
        if (
          snapshot === null ||
          !orderIdMatchesCaller(ref.externalTransactionId, snapshot.externalTransactionId)
        ) {
          throw new BillingProcessorRecordNotFoundError('google_play', ref.externalId);
        }
        return snapshot;
      }
      if (ref.externalProductId === null) {
        throw new BillingProcessorRecordNotFoundError('google_play', ref.externalId);
      }
      if (!isSoldProduct(soldProducts, ref.externalProductId, null)) {
        logUnmappedBillingProduct(ref.externalProductId, 'fetchTransaction');
        throw new BillingProcessorRecordNotFoundError('google_play', ref.externalId);
      }
      const productPurchase = await client.getProductPurchase(
        ref.externalProductId,
        ref.externalId
      );
      if (productPurchase === null) {
        throw new BillingProcessorRecordNotFoundError('google_play', ref.externalId);
      }
      const snapshot = mapProductTransactionSnapshot(
        ref.externalId,
        fetchedAt,
        productPurchase,
        ref.externalProductId
      );
      if (!orderIdMatchesCaller(ref.externalTransactionId, snapshot.externalTransactionId)) {
        throw new BillingProcessorRecordNotFoundError('google_play', ref.externalId);
      }
      return snapshot;
    },

    async acknowledgePurchase(acknowledgement: BillingPurchaseAcknowledgement): Promise<void> {
      const subscriptionPurchase = await client.getSubscriptionPurchase(
        acknowledgement.purchaseToken
      );
      if (subscriptionPurchase !== null) {
        if (isSubscriptionAcknowledgementPending(subscriptionPurchase)) {
          const context = readSubscriptionContext(
            subscriptionPurchase,
            acknowledgement.externalProductId
          );
          const productId = context.externalProductId ?? acknowledgement.externalProductId;
          await client.acknowledgeSubscriptionPurchase(productId, acknowledgement.purchaseToken);
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
  };
}
