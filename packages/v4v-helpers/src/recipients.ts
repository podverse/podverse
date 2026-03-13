export type RecipientSplitInput = {
  split: number;
};

export type NormalizedRecipientSplit<T> = T & {
  normalized_split: number;
};

export type RecipientAmount<T> = NormalizedRecipientSplit<T> & {
  final_amount: number;
};

/**
 * Normalizes recipient splits to integer percentages that sum to 100.
 * - Recipients with split >= 1 get at least 1%.
 * - When rounding is needed so the total is 100%, earlier recipients are rounded up
 *   and later ones rounded down.
 */
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

  const entries = recipients.map((recipient) => ({
    rawPct: (recipient.split / totalSplit) * 100,
    hasMinOne: recipient.split >= 1,
  }));

  const normalized = entries.map((entry) =>
    entry.hasMinOne ? Math.max(1, Math.floor(entry.rawPct)) : Math.floor(entry.rawPct)
  );

  const sum = normalized.reduce((s, n) => s + n, 0);
  const diff = 100 - sum;

  if (diff > 0) {
    let added = 0;
    for (let i = 0; i < entries.length && added < diff; i += 1) {
      const entry = entries[i];
      const current = normalized[i];
      if (!entry || current === undefined) continue;
      if (current < Math.ceil(entry.rawPct) && current < 100) {
        normalized[i] = current + 1;
        added += 1;
      }
    }
    while (added < diff) {
      let bumped = false;
      for (let i = 0; i < entries.length; i += 1) {
        const current = normalized[i];
        if (current !== undefined && current < 100) {
          normalized[i] = current + 1;
          added += 1;
          bumped = true;
          break;
        }
      }
      if (!bumped) break;
    }
  } else if (diff < 0) {
    const minAllowed = entries.map((entry) => (entry.hasMinOne ? 1 : 0));
    let removed = 0;
    for (let k = recipients.length - 1; k >= 0 && removed < -diff; k -= 1) {
      const current = normalized[k];
      const min = minAllowed[k] ?? 0;
      if (current !== undefined && current > min) {
        normalized[k] = current - 1;
        removed += 1;
      }
    }
  }

  return recipients.map((recipient, i) => ({
    ...recipient,
    normalized_split: normalized[i] ?? 0,
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
