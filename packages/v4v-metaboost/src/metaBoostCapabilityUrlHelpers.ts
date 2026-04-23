import { parseHttpOrHttpsUrl } from '@podverse/helpers-validation';

export function normalizeCapabilityBaseUrl(metaBoostNodeUrl: string): string {
  const trimmed = metaBoostNodeUrl.trim();
  if (trimmed === '') {
    throw new Error('MetaBoost node URL is empty');
  }
  const parsed = parseHttpOrHttpsUrl(trimmed);
  if (!parsed) {
    throw new Error('MetaBoost node URL is invalid');
  }
  return parsed.toString();
}

export function isValidTermsOfServiceHttpUrl(value: string): boolean {
  return parseHttpOrHttpsUrl(value) !== null;
}
