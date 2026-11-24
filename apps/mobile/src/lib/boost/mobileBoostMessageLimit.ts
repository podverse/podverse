export const BLIP0010_BTC_LN_BOOST_MESSAGE_CHAR_LIMIT = 400;

export function mobileBoostMessageMaxLength(
  hasMetaBoost: boolean,
  capability: {
    messageCharLimit: number | null;
    status: 'idle' | 'loading' | 'success' | 'error';
  }
): number | undefined {
  if (!hasMetaBoost) {
    return BLIP0010_BTC_LN_BOOST_MESSAGE_CHAR_LIMIT;
  }
  const { messageCharLimit, status } = capability;
  if (
    status === 'success' &&
    messageCharLimit !== null &&
    Number.isFinite(messageCharLimit) &&
    messageCharLimit >= 0
  ) {
    return Math.floor(messageCharLimit);
  }
  return undefined;
}
