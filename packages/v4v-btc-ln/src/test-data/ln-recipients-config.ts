import fs from 'fs';

/**
 * LN recipient entry from ln-recipients.local.json (keysend or lnaddress array).
 */
export type LocalLnRecipient = {
  address: string;
  name: string;
  split: number;
  fee?: boolean;
};

/**
 * Shape of tools/test-assets/config/ln-recipients.local.json (from discover-recipients.sh).
 */
export type LocalLnRecipientsConfig = {
  keysend: LocalLnRecipient[];
  lnaddress: LocalLnRecipient[];
};

/** Default BoostBox URL for local test value tags. */
export const METABOOST_URL = 'http://localhost:8080/boost';

/** Fallback LNURL addresses when no local config is present. */
export const LNURL_TEST_ADDRESSES = [
  'podverse+one@sandbox.albylabs.com',
  'podverse+two@sandbox.albylabs.com',
  'podverse+fee@sandbox.albylabs.com',
];

/** Default splits (percent) for three recipients when using fake data. */
export const VALUE_RECIPIENT_SPLITS = [60, 40, 1] as const;

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
};

const isLocalLnRecipient = (value: unknown): value is LocalLnRecipient => {
  if (!isRecord(value)) {
    return false;
  }
  const { address, name, split, fee } = value;
  if (typeof address !== 'string' || address.length === 0) {
    return false;
  }
  if (typeof name !== 'string' || name.length === 0) {
    return false;
  }
  if (typeof split !== 'number' || !Number.isFinite(split) || split <= 0) {
    return false;
  }
  if (fee !== undefined && typeof fee !== 'boolean') {
    return false;
  }
  return true;
};

const isLocalLnRecipientsConfig = (value: unknown): value is LocalLnRecipientsConfig => {
  if (!isRecord(value)) {
    return false;
  }
  const { keysend, lnaddress } = value;
  if (!Array.isArray(keysend) || !Array.isArray(lnaddress)) {
    return false;
  }
  return keysend.every(isLocalLnRecipient) && lnaddress.every(isLocalLnRecipient);
};

/**
 * Read and parse local LN recipients config (e.g. from discover-recipients.sh).
 * Config path is passed in so this package stays agnostic of tools/test-assets layout.
 */
export const readLocalLnRecipientsConfig = (configPath: string): LocalLnRecipientsConfig | null => {
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed: unknown = JSON.parse(raw);
    if (!isLocalLnRecipientsConfig(parsed)) {
      console.warn('Invalid local LN recipients config. Using built-in fake recipients instead.');
      return null;
    }
    return parsed;
  } catch (error) {
    console.warn(
      'Failed to read local LN recipients config. Using built-in fake recipients instead.',
      error
    );
    return null;
  }
};
