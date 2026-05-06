/**
 * Parity fixture matrix — plan **07b**
 * `.llm/plans/completed/feed-status-table-replacement/07b-parity-fixture-matrix.md`
 */

import { FeedConditionTypeKeyEnum } from '@orm/entities/feed/feedConditionType.js';
import { FeedLifecycleStateKeyEnum } from '@orm/entities/feed/feedLifecycleStateType.js';
import { FeedPolicyReasonEnum } from '@orm/entities/feed/feedPolicy.js';
import { describe, expect, it } from 'vitest';

import {
  applyLifecycleConstraintsToComputedPolicy,
  type ComputedFeedEffectivePolicy,
  computeEffectivePolicyFromConditionKeys,
} from './feedEffectivePolicyComputed.js';

function effectiveForParity(
  conditionKeys: FeedConditionTypeKeyEnum[],
  lifecycleKey: FeedLifecycleStateKeyEnum
): ComputedFeedEffectivePolicy {
  const computed = computeEffectivePolicyFromConditionKeys(conditionKeys);
  applyLifecycleConstraintsToComputedPolicy(lifecycleKey, computed);
  return computed;
}

describe('feed policy parity matrix (07b)', () => {
  it('1 — active clean feed: lifecycle active, no conditions → parse/public/add true', () => {
    const p = effectiveForParity([], FeedLifecycleStateKeyEnum.Active);
    expect(p.parseAllowed).toBe(true);
    expect(p.publicVisible).toBe(true);
    expect(p.addAllowed).toBe(true);
    expect(p.primaryBlockReason).toBe(null);
  });

  it('2 — oversized-only: active + oversized_detected → parse false, public true, add false', () => {
    const p = effectiveForParity(
      [FeedConditionTypeKeyEnum.OversizedDetected],
      FeedLifecycleStateKeyEnum.Active
    );
    expect(p.parseAllowed).toBe(false);
    expect(p.publicVisible).toBe(true);
    expect(p.addAllowed).toBe(false);
    expect(p.primaryBlockReason).toBe(FeedPolicyReasonEnum.OversizedDetected);
  });

  it('3 — spam-only: active + spam_detected → parse/public/add false', () => {
    const p = effectiveForParity(
      [FeedConditionTypeKeyEnum.SpamDetected],
      FeedLifecycleStateKeyEnum.Active
    );
    expect(p.parseAllowed).toBe(false);
    expect(p.publicVisible).toBe(false);
    expect(p.addAllowed).toBe(false);
    expect(p.primaryBlockReason).toBe(FeedPolicyReasonEnum.SpamDetected);
  });

  it('4 — spam + oversized concurrent: primary_block_reason follows REASON_PRIORITY (oversized over spam)', () => {
    const p = effectiveForParity(
      [FeedConditionTypeKeyEnum.SpamDetected, FeedConditionTypeKeyEnum.OversizedDetected],
      FeedLifecycleStateKeyEnum.Active
    );
    expect(p.parseAllowed).toBe(false);
    expect(p.publicVisible).toBe(false);
    expect(p.addAllowed).toBe(false);
    expect(p.primaryBlockReason).toBe(FeedPolicyReasonEnum.OversizedDetected);
  });

  it('5 — spam permitted: spam_detected + spam_permitted → parse/public/add true', () => {
    const p = effectiveForParity(
      [FeedConditionTypeKeyEnum.SpamDetected, FeedConditionTypeKeyEnum.SpamPermitted],
      FeedLifecycleStateKeyEnum.Active
    );
    expect(p.parseAllowed).toBe(true);
    expect(p.publicVisible).toBe(true);
    expect(p.addAllowed).toBe(true);
    expect(p.primaryBlockReason).toBe(null);
  });

  it('6 — pending_archive: optional empty conditions → lifecycle forces parse/public/add false', () => {
    const p = effectiveForParity([], FeedLifecycleStateKeyEnum.PendingArchive);
    expect(p.parseAllowed).toBe(false);
    expect(p.publicVisible).toBe(false);
    expect(p.addAllowed).toBe(false);
  });

  it('7 — archived: gates blocked regardless of conditions list', () => {
    const p = effectiveForParity([], FeedLifecycleStateKeyEnum.Archived);
    expect(p.parseAllowed).toBe(false);
    expect(p.publicVisible).toBe(false);
    expect(p.addAllowed).toBe(false);
  });

  it('8 — takedown + takedown_active → gates false, primary takedown_active', () => {
    const p = effectiveForParity(
      [FeedConditionTypeKeyEnum.TakedownActive],
      FeedLifecycleStateKeyEnum.Takedown
    );
    expect(p.parseAllowed).toBe(false);
    expect(p.publicVisible).toBe(false);
    expect(p.addAllowed).toBe(false);
    expect(p.primaryBlockReason).toBe(FeedPolicyReasonEnum.TakedownActive);
  });

  it('9 — manual_block: active + manual_block → all false, primary manual_block', () => {
    const p = effectiveForParity(
      [FeedConditionTypeKeyEnum.ManualBlock],
      FeedLifecycleStateKeyEnum.Active
    );
    expect(p.parseAllowed).toBe(false);
    expect(p.publicVisible).toBe(false);
    expect(p.addAllowed).toBe(false);
    expect(p.primaryBlockReason).toBe(FeedPolicyReasonEnum.ManualBlock);
  });

  it('10 — parse_allowed_override=true can restore parse=true while spam_detected is active (merge semantics)', () => {
    const computed = computeEffectivePolicyFromConditionKeys([
      FeedConditionTypeKeyEnum.SpamDetected,
    ]);
    expect(computed.parseAllowed).toBe(false);
    const merged = {
      parseAllowed: true,
      publicVisible: computed.publicVisible,
      addAllowed: computed.addAllowed,
    };
    expect(merged.parseAllowed).toBe(true);
    expect(merged.publicVisible).toBe(false);
    expect(merged.addAllowed).toBe(false);
  });
});
