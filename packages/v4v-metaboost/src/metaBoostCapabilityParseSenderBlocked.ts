import { getOwnPropertyValue } from '@podverse/helpers';

/**
 * Reads optional `sender_blocked` / `sender_block_message` from a capability JSON object.
 * Older MetaBoost nodes may omit these fields — treated as not blocked.
 */
export const parseSenderBlockedCapabilityFields = (
  data: object
): { senderBlocked: boolean; senderBlockMessage: string | null } => {
  const senderBlockedRaw = getOwnPropertyValue(data, 'sender_blocked');
  if (senderBlockedRaw !== undefined && typeof senderBlockedRaw !== 'boolean') {
    throw new Error('capability sender_blocked must be a boolean when present');
  }
  const senderBlocked = senderBlockedRaw === true;
  const blockMsgRaw = getOwnPropertyValue(data, 'sender_block_message');
  if (blockMsgRaw !== undefined && blockMsgRaw !== null && typeof blockMsgRaw !== 'string') {
    throw new Error('capability sender_block_message must be a string when present');
  }
  const trimmedMessage =
    typeof blockMsgRaw === 'string' && blockMsgRaw.trim() !== '' ? blockMsgRaw.trim() : null;
  return {
    senderBlocked,
    senderBlockMessage: senderBlocked ? trimmedMessage : null,
  };
};

export const appendSenderGuidToUrl = (absoluteUrl: string, senderGuid?: string | null): string => {
  const trimmed = senderGuid?.trim();
  if (trimmed === undefined || trimmed === '') {
    return absoluteUrl;
  }
  const u = new URL(absoluteUrl);
  u.searchParams.set('sender_guid', trimmed);
  return u.toString();
};
