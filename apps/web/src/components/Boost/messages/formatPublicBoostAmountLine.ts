import type { PublicBoostMessage } from '@podverse/v4v-metaboost';

const isSatoshisUnit = (amountUnit: string | null): boolean => {
  if (amountUnit === null) {
    return false;
  }
  const normalized = amountUnit.trim().toLowerCase();
  return normalized === 'satoshi';
};

const joinUnknownAmountParts = (
  amount: string,
  currencyRaw: string,
  amountUnitRaw: string
): string => {
  const segments = [amount];
  const currencyValue = currencyRaw.trim();
  const amountUnitValue = amountUnitRaw.trim();
  if (currencyValue !== '') {
    segments.push(currencyValue);
  }
  if (amountUnitValue !== '') {
    segments.push(amountUnitValue);
  }
  return segments.join(' ');
};

export type FormatPublicBoostAmountLabels = {
  satoshisDenominationLabel: string;
  btcNonSatoshiSuffix: string;
};

/**
 * Formats currency + amount for public boost message rows (aligned with Metaboost list card logic).
 */
export const formatPublicBoostAmountLine = (
  message: Pick<PublicBoostMessage, 'amount' | 'currency' | 'amountUnit'>,
  locale: string,
  labels: FormatPublicBoostAmountLabels
): string | null => {
  const rawAmount = message.amount?.trim() ?? '';
  if (rawAmount === '') {
    return null;
  }

  const currencyRaw = message.currency?.trim() ?? '';
  const currency = currencyRaw.toUpperCase();
  const amountUnitRaw = message.amountUnit?.trim() ?? '';

  if (currency === 'BTC') {
    if (isSatoshisUnit(message.amountUnit)) {
      return `${rawAmount} ${labels.satoshisDenominationLabel}`;
    }
    return `${rawAmount} ${labels.btcNonSatoshiSuffix}`;
  }

  if (currency === 'USD') {
    const n = Number(rawAmount);
    if (Number.isFinite(n)) {
      return new Intl.NumberFormat(locale, { style: 'currency', currency: 'USD' }).format(n);
    }
    return `${rawAmount} USD`;
  }

  return joinUnknownAmountParts(rawAmount, currencyRaw, amountUnitRaw);
};
