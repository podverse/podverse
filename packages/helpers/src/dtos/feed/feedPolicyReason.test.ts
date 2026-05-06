import { describe, expect, it } from 'vitest';

import { parseFeedPolicyPrimaryBlockReason, primaryBlockReasonForUi } from './feedPolicyReason.js';

describe('feedPolicyReason', () => {
  it('parseFeedPolicyPrimaryBlockReason accepts canonical keys', () => {
    expect(parseFeedPolicyPrimaryBlockReason('spam_detected')).toBe('spam_detected');
    expect(parseFeedPolicyPrimaryBlockReason(' takedown_active ')).toBe('takedown_active');
  });

  it('parseFeedPolicyPrimaryBlockReason rejects unknown values', () => {
    expect(parseFeedPolicyPrimaryBlockReason('unknown_reason_key')).toBe(null);
    expect(parseFeedPolicyPrimaryBlockReason('')).toBe(null);
    expect(parseFeedPolicyPrimaryBlockReason(null)).toBe(null);
  });

  it('primaryBlockReasonForUi returns unknown for unrecognized non-empty strings', () => {
    expect(primaryBlockReasonForUi('not_an_enum')).toBe('unknown');
    expect(primaryBlockReasonForUi('spam_detected')).toBe('spam_detected');
    expect(primaryBlockReasonForUi(null)).toBe(null);
  });
});
