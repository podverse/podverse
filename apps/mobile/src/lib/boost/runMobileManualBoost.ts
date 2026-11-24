import type {
  BoostPaymentProvider,
  ManualBoostRecipientEvent,
  ManualBoostRecipientInput,
} from '@podverse/v4v-btc-ln';
import { sendManualBoost } from '@podverse/v4v-btc-ln';
import type { MetaBoost } from '@podverse/v4v-metaboost';
import { resolveBoostExecutionStrategy } from '@podverse/v4v-metaboost';

import { mobileBoostPaymentDescription } from './mobileBoostPaymentDescription';

export type RunMobileManualBoostDeps = {
  postBoost: (input: { totalMsat: number }) => Promise<void>;
  provider: BoostPaymentProvider;
  rateLimitStatus: () => Promise<{ allowed: boolean; retryAfterMs: number }>;
};

export type RunMobileManualBoostInput = {
  appName: string;
  appVersion: string | null;
  feedGuid: string | null;
  feedTitle: string | null;
  httpMessagingEnabled: boolean;
  itemGuid: string | null;
  itemTitle: string | null;
  message: string;
  metaBoost: MetaBoost | null;
  onMetaboostUnreachable: () => Promise<void>;
  onRecipientEvent: (event: ManualBoostRecipientEvent) => void;
  recipients: ManualBoostRecipientInput[];
  senderGuid: string | null;
  senderName: string;
};

export type RunMobileManualBoostResult =
  | { outcome: 'rate_limit_check_failed' }
  | { outcome: 'rate_limited'; retryAfterMs: number }
  | { anyRecipientFailed: boolean; outcome: 'sent'; postError: unknown | null };

const definedTrimmed = (value: string | null): string | undefined => {
  if (value === null) {
    return undefined;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return undefined;
  }
  return trimmed;
};

const sentResult = (
  anyRecipientFailed: boolean,
  postError: unknown | null
): RunMobileManualBoostResult => {
  return { anyRecipientFailed, outcome: 'sent', postError };
};

export async function runMobileManualBoost(
  deps: RunMobileManualBoostDeps,
  input: RunMobileManualBoostInput
): Promise<RunMobileManualBoostResult> {
  const strategy = resolveBoostExecutionStrategy(input.metaBoost);
  const inMetaboostBranch =
    input.metaBoost !== null && (strategy.shouldUseMbrssV1 || strategy.shouldUseMbV1);
  const senderGuid = input.senderGuid === null ? '' : input.senderGuid.trim();
  const shouldPost =
    inMetaboostBranch &&
    input.httpMessagingEnabled &&
    strategy.shouldUseMbrssV1 &&
    senderGuid !== '';

  if (shouldPost) {
    let rateLimit: { allowed: boolean; retryAfterMs: number };
    try {
      rateLimit = await deps.rateLimitStatus();
    } catch {
      return { outcome: 'rate_limit_check_failed' };
    }
    if (!rateLimit.allowed) {
      return { outcome: 'rate_limited', retryAfterMs: rateLimit.retryAfterMs };
    }
  }

  const paymentDescription = inMetaboostBranch
    ? mobileBoostPaymentDescription(input.message, input.appName)
    : null;
  const allowBlipFallback = inMetaboostBranch ? false : strategy.allowBlipFallback;

  const result = await sendManualBoost({
    provider: deps.provider,
    recipients: input.recipients,
    paymentDescription,
    message: input.message,
    senderName: input.senderName,
    allowBlipFallback,
    appName: input.appName,
    feedGuid: definedTrimmed(input.feedGuid),
    feedTitle: definedTrimmed(input.feedTitle),
    itemGuid: definedTrimmed(input.itemGuid),
    itemTitle: definedTrimmed(input.itemTitle),
    onRecipientEvent: input.onRecipientEvent,
  });

  if (!shouldPost || !result.largestSplitSucceeded) {
    return sentResult(result.anyRecipientFailed, null);
  }

  try {
    await deps.postBoost({ totalMsat: result.totalMsat });
  } catch (error: unknown) {
    return sentResult(result.anyRecipientFailed, error);
  }
  return sentResult(result.anyRecipientFailed, null);
}
