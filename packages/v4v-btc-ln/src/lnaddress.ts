import { request } from '@podverse/helpers-requests';

export type LnaddressKeysendCustomData = {
  customKey: string;
  customValue: string;
};

export type LnaddressKeysendDetails = {
  pubkey: string;
  customData?: LnaddressKeysendCustomData[];
};

export const buildLnaddressKeysendUrl = (lnaddress: string): string | null => {
  const trimmed = lnaddress.trim();
  if (!trimmed) {
    return null;
  }
  const [username, domain] = trimmed.split('@');
  if (!username || !domain) {
    return null;
  }
  return `https://${domain}/.well-known/keysend/${encodeURIComponent(username)}`;
};

const getRecordValue = (value: unknown, key: string): unknown => {
  if (typeof value !== 'object' || value === null) {
    return undefined;
  }
  return Object.getOwnPropertyDescriptor(value, key)?.value;
};

const toCustomKey = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : null;
  }
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return String(value);
  }
  return null;
};

const toCustomValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return String(value);
  }
  return null;
};

const parseCustomData = (value: unknown): LnaddressKeysendCustomData[] | undefined => {
  if (!Array.isArray(value)) {
    return undefined;
  }
  const customData: LnaddressKeysendCustomData[] = [];
  for (const entry of value) {
    const customKey = toCustomKey(getRecordValue(entry, 'customKey'));
    const customValue = toCustomValue(getRecordValue(entry, 'customValue'));
    if (customKey && customValue !== null) {
      customData.push({ customKey, customValue });
    }
  }
  return customData.length > 0 ? customData : undefined;
};

export const parseLnaddressKeysendDetails = (value: unknown): LnaddressKeysendDetails | null => {
  if (typeof value !== 'object' || value === null) {
    return null;
  }
  const tag = getRecordValue(value, 'tag');
  const pubkey = getRecordValue(value, 'pubkey');
  if (tag !== 'keysend' || typeof pubkey !== 'string' || pubkey.trim().length === 0) {
    return null;
  }
  const customData = parseCustomData(getRecordValue(value, 'customData'));
  return customData ? { pubkey, customData } : { pubkey };
};

export const resolveLnaddressKeysendDetails = async (
  lnaddress: string
): Promise<LnaddressKeysendDetails | null> => {
  const url = buildLnaddressKeysendUrl(lnaddress);
  if (!url) {
    return null;
  }
  const { status, data } = await request<unknown>(url);
  if (status < 200 || status >= 300) {
    return null;
  }
  return parseLnaddressKeysendDetails(data);
};

export const toCustomRecords = (
  customData: LnaddressKeysendCustomData[] | undefined
): Record<string, string> | undefined => {
  if (!customData || customData.length === 0) {
    return undefined;
  }
  const records: Record<string, string> = {};
  for (const entry of customData) {
    records[entry.customKey] = entry.customValue;
  }
  return Object.keys(records).length > 0 ? records : undefined;
};
