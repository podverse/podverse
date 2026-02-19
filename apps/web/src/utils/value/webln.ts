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
  return Object.getOwnPropertyDescriptor(value, key)?.value;
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

export const supportsWeblnKeysend = (provider: WeblnProvider): boolean =>
  typeof provider.keysend === 'function';

declare global {
  interface Window {
    webln?: unknown;
  }
}

export {};
