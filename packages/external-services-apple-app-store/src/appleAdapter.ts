import type {
  JWSTransactionDecodedPayload,
  LastTransactionsItem,
  StatusResponse,
  TransactionInfoResponse,
} from '@apple/app-store-server-library';
import { Environment, SignedDataVerifier } from '@apple/app-store-server-library';
import { AutoRenewStatus } from '@apple/app-store-server-library';

import type {
  BillingCancelAutoRenewResult,
  BillingProcessorRecordRef,
  BillingSubscriptionStatus,
  BillingWebhookParseResult,
  BillingWebhookRequest,
  NormalizedSubscriptionSnapshot,
  NormalizedTransactionSnapshot,
  PaymentProcessorAdapter,
} from '@podverse/helpers';
import {
  BillingProcessorRecordNotFoundError,
  BillingWebhookVerificationError,
} from '@podverse/helpers';

import type {
  AppleSignedPayloadVerifier,
  CreateAppleClientConfig,
} from './AppStoreServerClient.js';
import { AppStoreServerClient, resolveAppleRuntimeEnvironment } from './AppStoreServerClient.js';
import {
  mapAppleStatusToBillingStatus,
  mapVerifiedNotificationToEvents,
} from './verifyNotification.js';

export interface AppleAdapterConfig extends CreateAppleClientConfig {
  client?: AppStoreServerClient;
  /** Reads StoreKit Testing transactions when `appleEnvironment` is `xcode`. */
  xcodeVerifier?: Pick<AppleSignedPayloadVerifier, 'verifyAndDecodeTransaction'>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toRawPayload(value: unknown): Record<string, unknown> {
  const json = JSON.stringify(value);
  const parsed: unknown = JSON.parse(json);
  return isRecord(parsed) ? parsed : {};
}

function parseWebhookPayload(rawBody: Uint8Array | string): { signedPayload: string } {
  const text = typeof rawBody === 'string' ? rawBody : new TextDecoder().decode(rawBody);
  let payload: unknown;
  try {
    payload = JSON.parse(text);
  } catch {
    throw new BillingWebhookVerificationError('apple', 'Webhook body is not valid JSON');
  }
  if (!isRecord(payload)) {
    throw new BillingWebhookVerificationError('apple', 'Webhook body must be a JSON object');
  }
  const signedPayload = Reflect.get(payload, 'signedPayload');
  if (typeof signedPayload !== 'string' || signedPayload.length === 0) {
    throw new BillingWebhookVerificationError('apple', 'Webhook body is missing signedPayload');
  }
  return { signedPayload };
}

function toIsoTimestamp(value: number | undefined): string | null {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }
  return new Date(value).toISOString();
}

/** StoreKit Testing purchases charge nothing, so they count as sandbox. */
function isSandboxEnvironment(value: Environment | string | undefined): boolean {
  return (
    value === Environment.SANDBOX ||
    value === 'Sandbox' ||
    value === Environment.XCODE ||
    value === Environment.LOCAL_TESTING
  );
}

function resolvePurchaseKindFromTransaction(
  transaction: {
    type?: string;
    originalTransactionId?: string;
  } | null
): 'one_time' | 'auto_renew' {
  if (transaction?.type === 'Non-Renewing Subscription') {
    return 'one_time';
  }
  if (transaction?.originalTransactionId === undefined) {
    return 'one_time';
  }
  return 'auto_renew';
}

function resolveTransactionAmount(
  transaction: { price?: number; currency?: string } | null
): { value: string; currencyCode: string } | null {
  if (
    transaction === null ||
    typeof transaction.price !== 'number' ||
    !Number.isFinite(transaction.price) ||
    typeof transaction.currency !== 'string' ||
    transaction.currency.length === 0
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
    value,
    currencyCode: transaction.currency,
  };
}

function ensureSignedTransactionInfo(
  response: TransactionInfoResponse,
  externalId: string
): string {
  const signedTransactionInfo = response.signedTransactionInfo;
  if (signedTransactionInfo === undefined || signedTransactionInfo.length === 0) {
    throw new BillingProcessorRecordNotFoundError('apple', externalId);
  }
  return signedTransactionInfo;
}

interface DecodedSubscriptionStatus {
  lastTransaction: LastTransactionsItem;
  transaction: {
    appAccountToken?: string;
    environment?: Environment | string;
    expiresDate?: number;
    originalPurchaseDate?: number;
    originalTransactionId?: string;
    productId?: string;
    purchaseDate?: number;
    signedDate?: number;
    type?: string;
  } | null;
  renewalInfo: {
    autoRenewProductId?: string;
    autoRenewStatus?: number;
    environment?: Environment | string;
    originalTransactionId?: string;
    productId?: string;
    renewalDate?: number;
    signedDate?: number;
  } | null;
}

function decodeStatusSortValue(entry: DecodedSubscriptionStatus): number {
  return (
    entry.transaction?.signedDate ??
    entry.transaction?.expiresDate ??
    entry.renewalInfo?.renewalDate ??
    entry.renewalInfo?.signedDate ??
    0
  );
}

async function decodeSubscriptionStatuses(
  client: AppStoreServerClient,
  response: StatusResponse,
  environment: Environment
): Promise<DecodedSubscriptionStatus[]> {
  const groups = response.data ?? [];
  const decoded: DecodedSubscriptionStatus[] = [];

  for (const group of groups) {
    const lastTransactions = group.lastTransactions ?? [];
    for (const lastTransaction of lastTransactions) {
      const transaction =
        lastTransaction.signedTransactionInfo === undefined
          ? null
          : await client.verifyAndDecodeTransaction(
              lastTransaction.signedTransactionInfo,
              environment
            );
      const renewalInfo =
        lastTransaction.signedRenewalInfo === undefined
          ? null
          : await client.verifyAndDecodeRenewalInfo(lastTransaction.signedRenewalInfo, environment);
      decoded.push({ lastTransaction, transaction, renewalInfo });
    }
  }

  return decoded;
}

function mapTransactionSnapshot(
  externalId: string,
  externalProductId: string | null,
  environment: Environment,
  fetchedAt: string,
  transaction: {
    appAccountToken?: string;
    currency?: string;
    environment?: Environment | string;
    expiresDate?: number;
    originalPurchaseDate?: number;
    originalTransactionId?: string;
    price?: number;
    productId?: string;
    purchaseDate?: number;
    revocationDate?: number;
    transactionId?: string;
    type?: string;
  },
  rawPayload: Record<string, unknown>
): NormalizedTransactionSnapshot {
  const purchaseKind = resolvePurchaseKindFromTransaction(transaction);
  const periodStart =
    toIsoTimestamp(transaction.purchaseDate) ?? toIsoTimestamp(transaction.originalPurchaseDate);
  const periodEnd = toIsoTimestamp(transaction.expiresDate);
  const revokedAt = toIsoTimestamp(transaction.revocationDate);
  return {
    processor: 'apple',
    externalTransactionId: transaction.transactionId ?? externalId,
    externalSubscriptionId:
      purchaseKind === 'auto_renew' ? (transaction.originalTransactionId ?? null) : null,
    accountBillingCustomerRef: transaction.appAccountToken ?? null,
    externalProductId: transaction.productId ?? externalProductId,
    externalBasePlanId: null,
    purchaseKind,
    settledAt: toIsoTimestamp(transaction.purchaseDate) ?? fetchedAt,
    periodStart,
    periodEnd,
    amount: resolveTransactionAmount(transaction),
    revokedAt,
    revocationReason: revokedAt === null ? null : 'refund',
    isSandbox: isSandboxEnvironment(transaction.environment ?? environment),
    fetchedAt,
    schemaVersion: 'apple-transaction-v1',
    rawPayload,
  };
}

function mapSubscriptionSnapshot(
  externalId: string,
  fetchedAt: string,
  environment: Environment,
  response: StatusResponse,
  latest: DecodedSubscriptionStatus
): NormalizedSubscriptionSnapshot {
  const transaction = latest.transaction;
  const renewalInfo = latest.renewalInfo;
  const purchaseKind = resolvePurchaseKindFromTransaction(transaction);
  const currentPeriodStart =
    toIsoTimestamp(transaction?.purchaseDate) ?? toIsoTimestamp(transaction?.originalPurchaseDate);
  const currentPeriodEnd =
    toIsoTimestamp(transaction?.expiresDate) ?? toIsoTimestamp(renewalInfo?.renewalDate);
  const accountBillingCustomerRef = transaction?.appAccountToken ?? null;
  const externalProductId =
    renewalInfo?.autoRenewProductId ?? transaction?.productId ?? renewalInfo?.productId ?? null;
  const rawPayload = toRawPayload({
    statusResponse: response,
    lastTransaction: latest.lastTransaction,
    transaction,
    renewalInfo,
  });
  const autoRenewStatus = renewalInfo?.autoRenewStatus;
  const status = mapAppleStatusToBillingStatus(latest.lastTransaction.status, autoRenewStatus);

  return {
    processor: 'apple',
    externalSubscriptionId:
      renewalInfo?.originalTransactionId ?? transaction?.originalTransactionId ?? externalId,
    accountBillingCustomerRef,
    externalProductId,
    externalBasePlanId: null,
    status,
    purchaseKind,
    currentPeriodStart,
    currentPeriodEnd,
    cancelAtPeriodEnd: autoRenewStatus === AutoRenewStatus.OFF,
    isSandbox: isSandboxEnvironment(
      transaction?.environment ?? renewalInfo?.environment ?? environment
    ),
    fetchedAt,
    schemaVersion: 'apple-subscription-status-v1',
    rawPayload,
  };
}

async function decodeXcodeTransaction(
  verifier: Pick<AppleSignedPayloadVerifier, 'verifyAndDecodeTransaction'>,
  ref: BillingProcessorRecordRef
): Promise<JWSTransactionDecodedPayload> {
  const signedTransaction = ref.signedTransaction ?? '';
  if (signedTransaction === '') {
    throw new BillingProcessorRecordNotFoundError('apple', ref.externalId);
  }
  let transaction: JWSTransactionDecodedPayload;
  try {
    transaction = await verifier.verifyAndDecodeTransaction(signedTransaction);
  } catch {
    throw new BillingProcessorRecordNotFoundError('apple', ref.externalId);
  }
  if (
    transaction.transactionId !== ref.externalId &&
    transaction.originalTransactionId !== ref.externalId
  ) {
    throw new BillingProcessorRecordNotFoundError('apple', ref.externalId);
  }
  return transaction;
}

/**
 * A StoreKit Testing transaction carries no renewal info, so the status comes from its dates: a
 * revoked transaction is revoked, one whose period has not ended is active, and any other is
 * expired.
 */
function mapXcodeSubscriptionSnapshot(
  ref: BillingProcessorRecordRef,
  fetchedAt: string,
  transaction: JWSTransactionDecodedPayload
): NormalizedSubscriptionSnapshot {
  const expiresDate = transaction.expiresDate;
  const status: BillingSubscriptionStatus =
    transaction.revocationDate !== undefined
      ? 'revoked'
      : expiresDate !== undefined && expiresDate > Date.parse(fetchedAt)
        ? 'active'
        : 'expired';
  return {
    processor: 'apple',
    externalSubscriptionId: transaction.originalTransactionId ?? ref.externalId,
    accountBillingCustomerRef: transaction.appAccountToken ?? null,
    externalProductId: transaction.productId ?? ref.externalProductId,
    externalBasePlanId: null,
    status,
    purchaseKind: resolvePurchaseKindFromTransaction(transaction),
    currentPeriodStart:
      toIsoTimestamp(transaction.purchaseDate) ?? toIsoTimestamp(transaction.originalPurchaseDate),
    currentPeriodEnd: toIsoTimestamp(expiresDate),
    cancelAtPeriodEnd: false,
    isSandbox: true,
    fetchedAt,
    schemaVersion: 'apple-xcode-transaction-v1',
    rawPayload: toRawPayload({ transaction }),
  };
}

/**
 * Reads the signed transaction the device posts, because Xcode's StoreKit Testing purchases never
 * reach Apple's servers. Those transactions are signed by Xcode, not Apple, so nothing proves the
 * device did not write one itself; `resolveAppleRuntimeEnvironment` refuses this mode in
 * production. Reconciliation has no transaction to read and finds no record, and there are no
 * server notifications.
 */
function createXcodeAppleAdapter(
  config: Pick<AppleAdapterConfig, 'bundleId' | 'xcodeVerifier'>
): PaymentProcessorAdapter {
  const verifier =
    config.xcodeVerifier ?? new SignedDataVerifier([], false, Environment.XCODE, config.bundleId);
  const nowIso = (): string => new Date().toISOString();

  return {
    id: 'apple',

    async verifyAndParseWebhook(): Promise<BillingWebhookParseResult> {
      throw new BillingWebhookVerificationError(
        'apple',
        'StoreKit Testing in Xcode sends no App Store Server Notifications'
      );
    },

    async fetchSubscription(ref): Promise<NormalizedSubscriptionSnapshot> {
      const transaction = await decodeXcodeTransaction(verifier, ref);
      return mapXcodeSubscriptionSnapshot(ref, nowIso(), transaction);
    },

    async fetchTransaction(ref): Promise<NormalizedTransactionSnapshot> {
      const transaction = await decodeXcodeTransaction(verifier, ref);
      return mapTransactionSnapshot(
        ref.externalId,
        ref.externalProductId,
        Environment.XCODE,
        nowIso(),
        transaction,
        toRawPayload({ transaction })
      );
    },

    async cancelAutoRenew(_externalSubscriptionId): Promise<BillingCancelAutoRenewResult> {
      return { outcome: 'manage_in_store' };
    },
  };
}

export function createAppleAdapter(config: AppleAdapterConfig): PaymentProcessorAdapter {
  if (resolveAppleRuntimeEnvironment(config.appleEnvironment, config.nodeEnv) === 'xcode') {
    return createXcodeAppleAdapter(config);
  }
  const client = config.client ?? AppStoreServerClient.fromConfig(config);
  const nowIso = (): string => new Date().toISOString();

  return {
    id: 'apple',

    async verifyAndParseWebhook(
      request: BillingWebhookRequest
    ): Promise<BillingWebhookParseResult> {
      const { signedPayload } = parseWebhookPayload(request.rawBody);
      const verified = await client.verifyAndDecodeNotification(signedPayload);
      const now = nowIso();
      return {
        schemaVersion: 'apple-asn-v2',
        rawPayload: toRawPayload({
          notification: verified.notification,
          transaction: verified.transaction,
          renewalInfo: verified.renewalInfo,
        }),
        events: mapVerifiedNotificationToEvents(verified, now),
      };
    },

    async fetchSubscription(ref): Promise<NormalizedSubscriptionSnapshot> {
      const fetchedAt = nowIso();
      const { response, environment } = await client.getAllSubscriptionStatusesWithFallback(
        ref.externalId
      );
      const decoded = await decodeSubscriptionStatuses(client, response, environment);
      if (decoded.length === 0) {
        throw new BillingProcessorRecordNotFoundError('apple', ref.externalId);
      }
      const latest = decoded.sort((a, b) => decodeStatusSortValue(b) - decodeStatusSortValue(a))[0];
      if (latest === undefined) {
        throw new BillingProcessorRecordNotFoundError('apple', ref.externalId);
      }
      return mapSubscriptionSnapshot(ref.externalId, fetchedAt, environment, response, latest);
    },

    async fetchTransaction(ref): Promise<NormalizedTransactionSnapshot> {
      const fetchedAt = nowIso();
      const { response, environment } = await client.getTransactionInfoWithFallback(ref.externalId);
      const signedTransactionInfo = ensureSignedTransactionInfo(response, ref.externalId);
      const transaction = await client.verifyAndDecodeTransaction(
        signedTransactionInfo,
        environment
      );
      return mapTransactionSnapshot(
        ref.externalId,
        ref.externalProductId,
        environment,
        fetchedAt,
        transaction,
        toRawPayload({ transactionInfoResponse: response, transaction })
      );
    },

    async cancelAutoRenew(_externalSubscriptionId): Promise<BillingCancelAutoRenewResult> {
      return { outcome: 'manage_in_store' };
    },
  };
}
