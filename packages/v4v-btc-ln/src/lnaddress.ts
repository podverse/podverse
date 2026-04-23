import { getOwnPropertyValue, isFiniteNumber, isObjectLike } from '@podverse/helpers';
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

const toCustomKey = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value.trim().length > 0 ? value : null;
  }
  if (isFiniteNumber(value)) {
    return String(value);
  }
  return null;
};

const toCustomValue = (value: unknown): string | null => {
  if (typeof value === 'string') {
    return value;
  }
  if (isFiniteNumber(value)) {
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
    const customKey = toCustomKey(getOwnPropertyValue(entry, 'customKey'));
    const customValue = toCustomValue(getOwnPropertyValue(entry, 'customValue'));
    if (customKey && customValue !== null) {
      customData.push({ customKey, customValue });
    }
  }
  return customData.length > 0 ? customData : undefined;
};

export const parseLnaddressKeysendDetails = (value: unknown): LnaddressKeysendDetails | null => {
  if (!isObjectLike(value)) {
    return null;
  }
  const tag = getOwnPropertyValue(value, 'tag');
  const pubkey = getOwnPropertyValue(value, 'pubkey');
  if (tag !== 'keysend' || typeof pubkey !== 'string' || pubkey.trim().length === 0) {
    return null;
  }
  const customData = parseCustomData(getOwnPropertyValue(value, 'customData'));
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
