import type { FeedPolicyPrimaryBlockReasonKey } from './feedPolicyReason.js';

export interface DTOFeedPolicy {
  parse_allowed: boolean;
  public_visible: boolean;
  add_allowed: boolean;
  primary_block_reason: FeedPolicyPrimaryBlockReasonKey | null;
}
