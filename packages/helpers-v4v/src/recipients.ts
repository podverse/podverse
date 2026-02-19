export type RecipientSplitInput = {
  split: number;
};

export type NormalizedRecipientSplit<T> = T & {
  normalized_split: number;
};

export type RecipientAmount<T> = NormalizedRecipientSplit<T> & {
  final_amount: number;
};

export const normalizeRecipientSplits = <T extends RecipientSplitInput>(
  recipients: T[]
): Array<NormalizedRecipientSplit<T>> => {
  const totalSplit = recipients.reduce((sum, recipient) => sum + recipient.split, 0);
  if (totalSplit <= 0) {
    return recipients.map((recipient) => ({
      ...recipient,
      normalized_split: 0,
    }));
  }

  return recipients.map((recipient) => ({
    ...recipient,
    normalized_split: Math.floor((recipient.split / totalSplit) * 100),
  }));
};

export const calculateRecipientAmounts = <T extends RecipientSplitInput>(
  recipients: T[],
  totalAmountToCreator: number
): Array<RecipientAmount<T>> => {
  return normalizeRecipientSplits(recipients).map((recipient) => ({
    ...recipient,
    final_amount: Math.floor((recipient.normalized_split / 100) * totalAmountToCreator),
  }));
};

export const isLnaddressRecipient = (type: string): boolean => type === 'lnaddress';
