/**
 * Pure feed effective-policy computation from condition keys + lifecycle guards (no DB).
 * Used by {@link FeedPolicyService} and parity tests (plan **07b**).
 */

import { FeedConditionTypeKeyEnum } from '@orm/entities/feed/feedConditionType.js';
import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';
import { FeedPolicyReasonEnum } from '@orm/entities/feed/feedPolicy.js';

export type ComputedFeedEffectivePolicy = {
  parseAllowed: boolean;
  publicVisible: boolean;
  addAllowed: boolean;
  primaryBlockReason: FeedPolicyReasonEnum | null;
};

const REASON_PRIORITY: FeedPolicyReasonEnum[] = [
  FeedPolicyReasonEnum.TakedownActive,
  FeedPolicyReasonEnum.OversizedDetected,
  FeedPolicyReasonEnum.SpamDetected,
  FeedPolicyReasonEnum.ManualBlock,
];

function getHighestPriorityReason(reasons: FeedPolicyReasonEnum[]): FeedPolicyReasonEnum | null {
  for (const priorityReason of REASON_PRIORITY) {
    if (reasons.includes(priorityReason)) {
      return priorityReason;
    }
  }
  return null;
}

/** Pure condition-key → effective flags (before overrides and lifecycle guards). */
export function computeEffectivePolicyFromConditionKeys(
  conditionKeys: FeedConditionTypeKeyEnum[]
): ComputedFeedEffectivePolicy {
  const reasons: FeedPolicyReasonEnum[] = [];
  let parseAllowed = true;
  let publicVisible = true;
  let addAllowed = true;

  if (conditionKeys.includes(FeedConditionTypeKeyEnum.TakedownActive)) {
    reasons.push(FeedPolicyReasonEnum.TakedownActive);
    return {
      parseAllowed: false,
      publicVisible: false,
      addAllowed: false,
      primaryBlockReason: FeedPolicyReasonEnum.TakedownActive,
    };
  }

  if (conditionKeys.includes(FeedConditionTypeKeyEnum.OversizedDetected)) {
    reasons.push(FeedPolicyReasonEnum.OversizedDetected);
    parseAllowed = false;
    addAllowed = false;
  }

  const hasSpamDetected = conditionKeys.includes(FeedConditionTypeKeyEnum.SpamDetected);
  const hasSpamPermitted = conditionKeys.includes(FeedConditionTypeKeyEnum.SpamPermitted);

  if (hasSpamDetected && !hasSpamPermitted) {
    reasons.push(FeedPolicyReasonEnum.SpamDetected);
    parseAllowed = false;
    publicVisible = false;
    addAllowed = false;
  } else if (hasSpamDetected && hasSpamPermitted) {
    parseAllowed = true;
    publicVisible = true;
    addAllowed = true;
  }

  if (conditionKeys.includes(FeedConditionTypeKeyEnum.ManualBlock)) {
    reasons.push(FeedPolicyReasonEnum.ManualBlock);
    parseAllowed = false;
    publicVisible = false;
    addAllowed = false;
  }

  return {
    parseAllowed,
    publicVisible,
    addAllowed,
    primaryBlockReason: getHighestPriorityReason(reasons),
  };
}

/** Management API / 05b / 01b: pending archive, archived, and takedown disallow parse/public/add. */
export function applyLifecycleConstraintsToComputedPolicy(
  lifecycleKey: FeedLifecycleStateKeyEnum,
  effective: ComputedFeedEffectivePolicy
): void {
  if (
    lifecycleKey === FeedLifecycleStateKeyEnum.PendingArchive ||
    lifecycleKey === FeedLifecycleStateKeyEnum.Archived ||
    lifecycleKey === FeedLifecycleStateKeyEnum.Takedown
  ) {
    effective.parseAllowed = false;
    effective.publicVisible = false;
    effective.addAllowed = false;
  }
}

/** After merging policy overrides, lifecycle still wins over overrides for blocked lifecycles. */
export function applyLifecycleConstraintsToEffectiveFlags(
  lifecycleKey: FeedLifecycleStateKeyEnum,
  flags: { parseAllowed: boolean; publicVisible: boolean; addAllowed: boolean }
): void {
  if (
    lifecycleKey === FeedLifecycleStateKeyEnum.PendingArchive ||
    lifecycleKey === FeedLifecycleStateKeyEnum.Archived ||
    lifecycleKey === FeedLifecycleStateKeyEnum.Takedown
  ) {
    flags.parseAllowed = false;
    flags.publicVisible = false;
    flags.addAllowed = false;
  }
}
