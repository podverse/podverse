import type { BoostKeysendPayment, BoostPaymentProvider } from '@podverse/v4v-btc-ln';

type WeblnKeysendOptions = {
  destination: string;
  amount: number;
  customRecords?: Record<string, string>;
};

type WeblnProvider = {
  enable: () => Promise<void>;
  sendPayment: (invoice: string) => Promise<unknown>;
  keysend?: (options: WeblnKeysendOptions) => Promise<unknown>;
};

const getRecordValue = (value: unknown, key: string): unknown => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  return (value as Record<string, unknown>)[key];
};

const isWeblnProvider = (value: unknown): value is WeblnProvider => {
  const enable = getRecordValue(value, 'enable');
  const sendPayment = getRecordValue(value, 'sendPayment');
  const keysend = getRecordValue(value, 'keysend');

  return (
    typeof enable === 'function' &&
    typeof sendPayment === 'function' &&
    (keysend === undefined || typeof keysend === 'function')
  );
};

export const getWeblnProvider = (): WeblnProvider | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const candidate = window.webln;
  return isWeblnProvider(candidate) ? candidate : null;
};

export const ensureWeblnEnabled = async (): Promise<WeblnProvider | null> => {
  const provider = getWeblnProvider();
  if (!provider) {
    return null;
  }
  await provider.enable();
  return provider;
};

export const createWeblnBoostPaymentProvider = (webln: WeblnProvider): BoostPaymentProvider => ({
  payInvoice: async (invoice: string) => {
    await webln.sendPayment(invoice);
  },
  keysend: async (payment: BoostKeysendPayment) => {
    if (typeof webln.keysend !== 'function') {
      throw new Error('WebLN keysend is not available.');
    }
    await webln.keysend({
      destination: payment.destination,
      amount: payment.amountSats,
      customRecords: payment.customRecords,
    });
  },
});

export const supportsWeblnKeysend = (provider: WeblnProvider): boolean =>
  typeof provider.keysend === 'function';

declare global {
  interface Window {
    webln?: unknown;
  }
}

export {};
