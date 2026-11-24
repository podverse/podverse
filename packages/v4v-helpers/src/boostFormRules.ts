/**
 * A signed-out payment carries no name and no message. A signed-in payment carries the field
 * values, including blanks.
 */
export const boostFieldsForPayment = (
  isLoggedIn: boolean,
  yourName: string,
  message: string
): { message: string; yourName: string } => {
  if (!isLoggedIn) {
    return { message: '', yourName: '' };
  }
  return { message, yourName };
};

/**
 * Name and message show when MetaBoost is present, or when a node recipient can carry them on a
 * keysend. An lnaddress-only payment with no MetaBoost keeps the existing notice and hides the
 * fields.
 */
export const showBoostNameAndMessageFields = (input: {
  hasLnaddressRecipient: boolean;
  hasNodeRecipient: boolean;
  hasMetaBoost: boolean;
}): boolean => {
  if (input.hasMetaBoost) {
    return true;
  }
  if (input.hasNodeRecipient) {
    return true;
  }
  return !input.hasLnaddressRecipient;
};
