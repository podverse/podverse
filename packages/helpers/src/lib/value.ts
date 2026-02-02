import type { DTOItemValueRecipient } from '../dtos/item/itemValueRecipient.js';
import type { DTOChannelValueRecipient } from '../dtos/channel/channelValueRecipient.js';

export type NormalizedChannelValueRecipient = DTOChannelValueRecipient & {
  normalized_split: number;
  final_amount: number;
};
export type NormalizedItemValueRecipient = DTOItemValueRecipient & {
  normalized_split: number;
  final_amount: number;
};

export type AppValueRecipient = {
  type: string;
  address: string;
  name: string;
  custom_key?: string | null;
  custom_value?: string | null;
  normalized_split: number;
  final_amount: number;
};

// Helper to ensure integer splits sum to 100 using the largest remainder method
function normalizeRecipients<T extends { split: number }>(
  recipients: T[],
  total_amount: number
): Array<T & { normalized_split: number; final_amount: number }> {
  const totalSplit = recipients.reduce((sum, r) => sum + r.split, 0);

  if (totalSplit === 0) {
    // If all splits are zero, return all normalized_split as 0 and final_amount as 0
    return recipients.map((recipient) => ({
      ...recipient,
      normalized_split: 0,
      final_amount: 0,
    }));
  }

  // Step 1: Calculate raw normalized splits and keep track of remainders
  const rawSplits = recipients.map((r) => (r.split / totalSplit) * 100);
  const flooredSplits = rawSplits.map(Math.floor);
  const sumFloored = flooredSplits.reduce((a, b) => a + b, 0);

  // Step 2: Distribute the remaining percentage points to recipients with largest remainders
  const remainders = rawSplits.map((val, i) => ({
    index: i,
    remainder: val - (flooredSplits[i] ?? 0),
  }));
  remainders.sort((a, b) => b.remainder - a.remainder);

  const normalizedSplits = [...flooredSplits];
  const pointsToDistribute = 100 - sumFloored;
  for (let i = 0; i < pointsToDistribute; i++) {
    const remainder = remainders[i];
    if (remainder !== undefined) {
      const idx = remainder.index;
      if (normalizedSplits[idx] !== undefined) {
        normalizedSplits[idx]++;
      }
    }
  }

  // Step 3: Ensure no recipient with a nonzero split gets a normalized_split of 0
  for (let i = 0; i < recipients.length; i++) {
    const recipient = recipients[i];
    const normalizedSplit = normalizedSplits[i];
    if (recipient && recipient.split > 0 && normalizedSplit === 0) {
      // Find a recipient with normalized_split > 1 to take 1 from
      const donorIndex = normalizedSplits.findIndex(
        (val, idx) => val !== undefined && val > 1 && idx !== i
      );
      const donorValue = normalizedSplits[donorIndex];
      const currentValue = normalizedSplits[i];
      if (donorIndex !== -1 && donorValue !== undefined && currentValue !== undefined) {
        normalizedSplits[donorIndex] = donorValue - 1;
        normalizedSplits[i] = currentValue + 1;
      }
    }
  }

  // Step 4: Recalculate final_amounts based on normalized splits
  return recipients.map((recipient, i) => ({
    ...recipient,
    normalized_split: normalizedSplits[i] ?? 0,
    final_amount: Math.floor(((normalizedSplits[i] ?? 0) / 100) * total_amount),
  }));
}

export function normalizeChannelValueRecipients(
  recipients: DTOChannelValueRecipient[],
  total_amount: number
): NormalizedChannelValueRecipient[] {
  return normalizeRecipients(recipients, total_amount);
}

export function normalizeItemValueRecipients(
  recipients: DTOItemValueRecipient[],
  total_amount: number
): NormalizedItemValueRecipient[] {
  return normalizeRecipients(recipients, total_amount);
}
