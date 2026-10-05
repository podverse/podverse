import type {
  JWSRenewalInfoDecodedPayload,
  JWSTransactionDecodedPayload,
} from '@apple/app-store-server-library';
import {
  AutoRenewStatus,
  Environment,
  NotificationTypeV2,
  Status,
  Subtype,
  Type,
} from '@apple/app-store-server-library';

import type {
  BillingAmount,
  BillingRevocationReason,
  BillingSubscriptionStatus,
  NormalizedBillingEvent,
} from '@podverse/helpers';

import type { VerifiedNotificationPayload } from './AppStoreServerClient.js';

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
    notification.renewalInfo?.environment ??
    notification.notification.data?.environment ??
    notification.environment
  );
}

function resolvePurchaseKind(
  transaction: JWSTransactionDecodedPayload | null
): 'one_time' | 'auto_renew' {
  if (transaction?.type === Type.NON_RENEWING_SUBSCRIPTION) {
    return 'one_time';
  }
  return 'auto_renew';
}

function resolveSubscriptionId(
  purchaseKind: 'one_time' | 'auto_renew',
  transaction: JWSTransactionDecodedPayload | null,
  renewalInfo: JWSRenewalInfoDecodedPayload | null
): string | null {
  if (purchaseKind === 'one_time') {
    return null;
  }
  return transaction?.originalTransactionId ?? renewalInfo?.originalTransactionId ?? null;
}

function resolveProductId(
  transaction: JWSTransactionDecodedPayload | null,
  renewalInfo: JWSRenewalInfoDecodedPayload | null
): string | null {
  return (
    transaction?.productId ?? renewalInfo?.autoRenewProductId ?? renewalInfo?.productId ?? null
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
    toIsoTimestamp(notification.renewalInfo?.signedDate) ??
    fallback
  );
}

function appleRefundOrRevokeEvents(input: {
  notificationUuid: string | undefined;
  eventSuffix: 'refund' | 'revoke';
  reason: BillingRevocationReason;
  accountBillingCustomerRef: string | null;
  occurredAt: string;
  isSandbox: boolean;
  externalTransactionId: string | null;
  externalSubscriptionId: string | null;
}): NormalizedBillingEvent[] {
  const shared = {
    type: 'refund_or_revoke' as const,
    processor: 'apple' as const,
    processorEventId: buildProcessorEventId(input.notificationUuid, input.eventSuffix),
    accountBillingCustomerRef: input.accountBillingCustomerRef,
    accountId: null,
    occurredAt: input.occurredAt,
    isSandbox: input.isSandbox,
    reason: input.reason,
    revokedAt: input.occurredAt,
  };

  if (input.externalTransactionId !== null) {
    return [
      {
        ...shared,
        externalTransactionId: input.externalTransactionId,
        externalSubscriptionId: input.externalSubscriptionId,
      },
    ];
  }
  if (input.externalSubscriptionId === null) {
    return [];
  }
  return [
    {
      ...shared,
      externalTransactionId: null,
      externalSubscriptionId: input.externalSubscriptionId,
    },
  ];
}

export function mapAppleStatusToBillingStatus(
  status: number | Status | undefined,
  autoRenewStatus: number | AutoRenewStatus | undefined
): BillingSubscriptionStatus {
  if (status === Status.ACTIVE) {
    return autoRenewStatus === AutoRenewStatus.OFF ? 'cancelled_active' : 'active';
  }
  if (status === Status.BILLING_GRACE_PERIOD) {
    return 'in_grace_period';
  }
  if (status === Status.BILLING_RETRY) {
    return 'past_due';
  }
  if (status === Status.EXPIRED) {
    return 'expired';
  }
  if (status === Status.REVOKED) {
    return 'revoked';
  }
  return 'pending';
}

export function mapVerifiedNotificationToEvents(
  notification: VerifiedNotificationPayload,
  fallbackNowIso: string
): NormalizedBillingEvent[] {
  const notificationType = notification.notification.notificationType;
  if (
    notificationType === undefined ||
    notificationType === NotificationTypeV2.TEST ||
    notificationType === 'TEST'
  ) {
    return [];
  }

  const purchaseKind = resolvePurchaseKind(notification.transaction);
  const externalSubscriptionId = resolveSubscriptionId(
    purchaseKind,
    notification.transaction,
    notification.renewalInfo
  );
  const externalProductId = resolveProductId(notification.transaction, notification.renewalInfo);
  const externalTransactionId = notification.transaction?.transactionId ?? null;
  const accountBillingCustomerRef =
    notification.transaction?.appAccountToken ?? notification.renewalInfo?.appAccountToken ?? null;
  const occurredAt = resolveOccurredAt(notification, fallbackNowIso);
  const isSandbox = isSandboxEnvironment(notificationEnvironment(notification));
  const periodStart =
    toIsoTimestamp(notification.transaction?.purchaseDate) ??
    toIsoTimestamp(notification.transaction?.originalPurchaseDate);
  const periodEnd =
    toIsoTimestamp(notification.transaction?.expiresDate) ??
    toIsoTimestamp(notification.renewalInfo?.renewalDate);
  const periodEndFromGrace = toIsoTimestamp(notification.renewalInfo?.gracePeriodExpiresDate);
  const amount = resolveAmount(notification.transaction);
  const notificationUuid = notification.notification.notificationUUID;

  if (notificationType === NotificationTypeV2.REVOKE || notificationType === 'REVOKE') {
    return appleRefundOrRevokeEvents({
      notificationUuid,
      eventSuffix: 'revoke',
      reason: 'store_revoke',
      accountBillingCustomerRef,
      occurredAt,
      isSandbox,
      externalTransactionId,
      externalSubscriptionId,
    });
  }

  if (notificationType === NotificationTypeV2.REFUND || notificationType === 'REFUND') {
    return appleRefundOrRevokeEvents({
      notificationUuid,
      eventSuffix: 'refund',
      reason: 'refund',
      accountBillingCustomerRef,
      occurredAt,
      isSandbox,
      externalTransactionId,
      externalSubscriptionId,
    });
  }

  if (
    notificationType === NotificationTypeV2.GRACE_PERIOD_EXPIRED ||
    notificationType === 'GRACE_PERIOD_EXPIRED'
  ) {
    if (externalSubscriptionId === null) {
      return [];
    }
    return [
      {
        type: 'grace_exited',
        processor: 'apple',
        processorEventId: buildProcessorEventId(notificationUuid, 'grace_exited_lapsed'),
        accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox,
        externalSubscriptionId,
        outcome: 'lapsed',
      },
    ];
  }

  if (
    notificationType === NotificationTypeV2.DID_FAIL_TO_RENEW ||
    notificationType === 'DID_FAIL_TO_RENEW'
  ) {
    if (externalSubscriptionId === null) {
      return [];
    }
    return [
      {
        type: 'subscription_renewal_failed',
        processor: 'apple',
        processorEventId: buildProcessorEventId(notificationUuid, 'renewal_failed'),
        accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox,
        externalSubscriptionId,
        periodEnd: periodEndFromGrace ?? periodEnd,
      },
    ];
  }

  if (notificationType === NotificationTypeV2.EXPIRED || notificationType === 'EXPIRED') {
    if (externalSubscriptionId === null) {
      return [];
    }
    return [
      {
        type: 'subscription_expired',
        processor: 'apple',
        processorEventId: buildProcessorEventId(notificationUuid, 'expired'),
        accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox,
        externalSubscriptionId,
        expiredAt: periodEnd ?? occurredAt,
      },
    ];
  }

  if (
    notificationType === NotificationTypeV2.DID_CHANGE_RENEWAL_STATUS ||
    notificationType === 'DID_CHANGE_RENEWAL_STATUS'
  ) {
    if (externalSubscriptionId === null) {
      return [];
    }
    if (
      notification.notification.subtype === Subtype.AUTO_RENEW_DISABLED ||
      notification.notification.subtype === 'AUTO_RENEW_DISABLED'
    ) {
      return [
        {
          type: 'subscription_cancelled',
          processor: 'apple',
          processorEventId: buildProcessorEventId(notificationUuid, 'cancelled'),
          accountBillingCustomerRef,
          accountId: null,
          occurredAt,
          isSandbox,
          externalSubscriptionId,
          periodEnd,
        },
      ];
    }
    if (
      notification.notification.subtype === Subtype.AUTO_RENEW_ENABLED ||
      notification.notification.subtype === 'AUTO_RENEW_ENABLED'
    ) {
      return [
        {
          type: 'subscription_activated',
          processor: 'apple',
          processorEventId: buildProcessorEventId(notificationUuid, 'reactivated'),
          accountBillingCustomerRef,
          accountId: null,
          occurredAt,
          isSandbox,
          externalSubscriptionId,
          externalProductId,
          externalBasePlanId: null,
          periodStart,
          periodEnd,
        },
      ];
    }
  }

  if (notificationType === NotificationTypeV2.DID_RENEW || notificationType === 'DID_RENEW') {
    if (
      externalSubscriptionId === null ||
      externalTransactionId === null ||
      periodStart === null ||
      periodEnd === null
    ) {
      return [];
    }
    return [
      {
        type: 'subscription_renewed',
        processor: 'apple',
        processorEventId: buildProcessorEventId(notificationUuid, 'renewed'),
        accountBillingCustomerRef,
        accountId: null,
        occurredAt,
        isSandbox,
        externalSubscriptionId,
        externalProductId,
        externalBasePlanId: null,
        externalTransactionId,
        periodStart,
        periodEnd,
        amount,
      },
    ];
  }

  if (
    notificationType === NotificationTypeV2.SUBSCRIBED ||
    notificationType === 'SUBSCRIBED' ||
    notificationType === NotificationTypeV2.OFFER_REDEEMED ||
    notificationType === 'OFFER_REDEEMED' ||
    notificationType === NotificationTypeV2.ONE_TIME_CHARGE ||
    notificationType === 'ONE_TIME_CHARGE'
  ) {
    if (externalTransactionId === null) {
      if (externalSubscriptionId === null) {
        return [];
      }
      return [
        {
          type: 'subscription_activated',
          processor: 'apple',
          processorEventId: buildProcessorEventId(notificationUuid, 'activated'),
          accountBillingCustomerRef,
          accountId: null,
          occurredAt,
          isSandbox,
          externalSubscriptionId,
          externalProductId,
          externalBasePlanId: null,
          periodStart,
          periodEnd,
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
        purchaseKind,
        externalTransactionId,
        externalSubscriptionId,
        externalProductId,
        externalBasePlanId: null,
        periodStart,
        periodEnd,
        amount,
      },
    ];
  }

  return [];
}
