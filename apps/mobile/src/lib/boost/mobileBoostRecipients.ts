import type { ManualBoostRecipientInput } from '@podverse/v4v-btc-ln';
import { calculateRecipientAmounts } from '@podverse/v4v-helpers';

export type MobileBoostValueRecipient = {
  address: string;
  customKey: string | null;
  customValue: string | null;
  name: string | null;
  split: number;
  type: string;
};

export type MobileBoostValueBlock = {
  recipients: readonly MobileBoostValueRecipient[];
  type: string;
};

/** Positive whole sats, or null when the text is not one. */
export function parseBoostSatsAmount(value: string): number | null {
  const trimmed = value.trim();
  if (!/^[0-9]+$/.test(trimmed)) {
    return null;
  }
  const amount = Number(trimmed);
  if (!Number.isSafeInteger(amount) || amount < 1) {
    return null;
  }
  return amount;
}

const lightningRecipients = (
  blocks: readonly MobileBoostValueBlock[]
): MobileBoostValueRecipient[] => {
  const recipients: MobileBoostValueRecipient[] = [];
  for (const block of blocks) {
    if (block.type !== 'lightning') {
      continue;
    }
    recipients.push(...block.recipients);
  }
  return recipients;
};

export function lightningRecipientsForBoost(input: {
  channelValues: readonly MobileBoostValueBlock[];
  /** Null when the sheet has no item. An empty array means the item has no value rows. */
  itemValues: readonly MobileBoostValueBlock[] | null;
}): MobileBoostValueRecipient[] {
  const { channelValues, itemValues } = input;
  if (itemValues !== null && itemValues.length > 0) {
    const itemHasLightning = itemValues.some((block) => block.type === 'lightning');
    if (itemHasLightning) {
      return lightningRecipients(itemValues);
    }
  }
  return lightningRecipients(channelValues);
}

const lightningTypeFor = (type: string): 'lnaddress' | 'node' | null => {
  if (type === 'lnaddress' || type === 'node') {
    return type;
  }
  return null;
};

export function manualBoostRecipientsFromLightning(
  recipients: readonly MobileBoostValueRecipient[],
  totalSats: number
): ManualBoostRecipientInput[] {
  const amounts = calculateRecipientAmounts([...recipients], totalSats);
  return amounts.map((recipient, index) => {
    const lightningType = lightningTypeFor(recipient.type);
    const valueType = lightningType === null ? recipient.type : 'lightning';
    return {
      id: `${valueType}-${lightningType ?? recipient.type}-${recipient.address}-${index}`,
      valueType,
      recipientType: lightningType,
      address: recipient.address,
      name: recipient.name,
      customKey: recipient.customKey,
      customValue: recipient.customValue,
      normalizedSplit: recipient.normalized_split,
      split: recipient.split,
      finalAmountSats: recipient.final_amount,
    };
  });
}
