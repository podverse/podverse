import type { JWSTransactionDecodedPayload } from '@apple/app-store-server-library';
import { Environment, NotificationTypeV2 } from '@apple/app-store-server-library';

import type {
  BillingAmount,
  BillingRevocationReason,
  NormalizedBillingEvent,
} from '@podverse/helpers';
import { resolveBillingProcessorProductsFromEnv } from '@podverse/helpers';

import type { VerifiedNotificationPayload } from './AppStoreServerClient.js';

/** App Store `type` for a membership this deployment sells. */
export function appleSoldTransactionType(): string {
  return 'Non-Renewing Subscription';
}

/** App Store `type` this deployment does not sell. Those notifications produce no events. */
export function appleUnsoldTransactionType(): string {
  return 'Auto-Renewable Subscription';
}

export interface SoldBillingProduct {
  externalProductId: string;
  externalBasePlanId: string | null;
}

export function loadAppleSoldProducts(
  override: readonly SoldBillingProduct[] | undefined
): readonly SoldBillingProduct[] {
  if (override !== undefined) {
    return override;
  }
  return resolveBillingProcessorProductsFromEnv(process.env).products.filter(
    (product) => product.processor === 'apple'
  );
}

export function isSoldBillingProduct(
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

export function logUnmappedBillingProduct(
  processor: string,
  productId: string | null,
  notificationType: string
): void {
  // An authentic notification for a product this deployment does not sell is ignored.
  // eslint-disable-next-line no-console -- info is the level for a skipped notification
  console.info(
    `Billing notification ignored for an unmapped product processor=${processor} productId=${productId ?? ''} notificationType=${notificationType}`
  );
}

function toIsoTimestamp(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return new Date(value).toISOString();
}

function isSandboxEnvironment(value: Environment | string | undefined): boolean {
  return value === Environment.SANDBOX || value === 'Sandbox';
}

function notificationEnvironment(
  notification: VerifiedNotificationPayload
): Environment | string | undefined {
  return (
    notification.transaction?.environment ??
    notification.notification.data?.environment ??
    notification.environment
  );
}

function resolveAmount(transaction: JWSTransactionDecodedPayload | null): BillingAmount | null {
  if (transaction === null) {
    return null;
  }
  if (
    typeof transaction.currency !== 'string' ||
    transaction.currency.length === 0 ||
    typeof transaction.price !== 'number' ||
    !Number.isFinite(transaction.price)
  ) {
    return null;
  }

  const sign = transaction.price < 0 ? '-' : '';
  const absolute = Math.abs(Math.trunc(transaction.price));
  const whole = Math.floor(absolute / 1000);
  const fractional = String(absolute % 1000)
    .padStart(3, '0')
    .replace(/0+$/, '');
  const value = fractional.length > 0 ? `${sign}${whole}.${fractional}` : `${sign}${whole}`;
  return {
    currencyCode: transaction.currency,
    value,
  };
}

function buildProcessorEventId(notificationUuid: string | undefined, suffix: string): string {
  const base = notificationUuid?.trim();
  if (base === undefined || base === '') {
    return `unknown:${suffix}`;
  }
  return `${base}:${suffix}`;
}

function resolveOccurredAt(notification: VerifiedNotificationPayload, fallback: string): string {
  return (
    toIsoTimestamp(notification.notification.signedDate) ??
    toIsoTimestamp(notification.transaction?.signedDate) ??
    toIsoTimestamp(notification.transaction?.purchaseDate) ??
    fallback
  );
}

function notificationTypeLabel(notificationType: string | undefined): string {
  return notificationType ?? 'unknown';
}

function isNotificationType(
  notificationType: string | undefined,
  expected: NotificationTypeV2,
  wireValue: string
): boolean {
  return notificationType === expected || notificationType === wireValue;
}

export function mapVerifiedNotificationToEvents(
  notification: VerifiedNotificationPayload,
  fallbackNowIso: string,
  soldProducts: readonly SoldBillingProduct[]
): NormalizedBillingEvent[] {
  const notificationType = notification.notification.notificationType;
  if (
    notificationType === undefined ||
    isNotificationType(notificationType, NotificationTypeV2.TEST, 'TEST')
  ) {
    return [];
  }

  const transaction = notification.transaction;
  const productId = transaction?.productId ?? null;
  const label = notificationTypeLabel(notificationType);
  if (transaction?.type === appleUnsoldTransactionType()) {
    logUnmappedBillingProduct('apple', productId, label);
    return [];
  }

  const externalTransactionId = transaction?.transactionId ?? null;
  const isCharge = isNotificationType(
    notificationType,
    NotificationTypeV2.ONE_TIME_CHARGE,
    'ONE_TIME_CHARGE'
  );
  const isRefund = isNotificationType(notificationType, NotificationTypeV2.REFUND, 'REFUND');
  const isRevoke = isNotificationType(notificationType, NotificationTypeV2.REVOKE, 'REVOKE');
  if (!isCharge && !isRefund && !isRevoke) {
    return [];
  }

  if (!isSoldBillingProduct(soldProducts, productId, null)) {
    logUnmappedBillingProduct('apple', productId, label);
    return [];
  }
  if (externalTransactionId === null) {
    return [];
  }
  if (isCharge && transaction?.type !== appleSoldTransactionType()) {
    return [];
  }

  const accountBillingCustomerRef = transaction?.appAccountToken ?? null;
  const occurredAt = resolveOccurredAt(notification, fallbackNowIso);
  const isSandbox = isSandboxEnvironment(notificationEnvironment(notification));
  const notificationUuid = notification.notification.notificationUUID;

  if (isRefund || isRevoke) {
    const reason: BillingRevocationReason = isRevoke ? 'store_revoke' : 'refund';
    const eventSuffix = isRevoke ? 'revoke' : 'refund';
    return [
      {
        type: 'refund_or_revoke',
        processor: 'apple',
        processorEventId: buildProcessorEventId(notificationUuid, eventSuffix),
        accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox,
        reason,
        revokedAt: occurredAt,
        externalTransactionId,
      },
    ];
  }

  return [
    {
      type: 'payment_settled',
      processor: 'apple',
      processorEventId: buildProcessorEventId(notificationUuid, 'payment_settled'),
      accountBillingCustomerRef,
      accountId: null,
      occurredAt,
      isSandbox,
      externalProductId: productId,
      externalBasePlanId: null,
      externalTransactionId,
      periodStart:
        toIsoTimestamp(transaction?.purchaseDate) ??
        toIsoTimestamp(transaction?.originalPurchaseDate),
      periodEnd: toIsoTimestamp(transaction?.expiresDate),
      amount: resolveAmount(transaction),
    },
  ];
}
