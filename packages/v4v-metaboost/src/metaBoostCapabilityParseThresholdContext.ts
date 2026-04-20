import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';

export type MetaBoostCapabilityThresholdContext = {
  preferredCurrency: string | null;
  minimumMessageAmountMinor: number | null;
  conversionEndpointUrl: string | null;
};

const parseOptionalNonEmptyString = (value: unknown, fieldName: string): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string when provided`);
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    throw new Error(`${fieldName} must be a non-empty string when provided`);
  }
  return trimmed;
};

const parseOptionalNonNegativeInteger = (value: unknown, fieldName: string): number | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer when provided`);
  }
  return value;
};

const parseOptionalHttpUrl = (value: unknown, fieldName: string): string | null => {
  const parsedString = parseOptionalNonEmptyString(value, fieldName);
  if (parsedString === null) {
    return null;
  }
  try {
    const parsed = new URL(parsedString);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      throw new Error(`${fieldName} must be an HTTP(S) URL when provided`);
    }
  } catch {
    throw new Error(`${fieldName} must be an HTTP(S) URL when provided`);
  }
  return parsedString;
};

export const parseCapabilityThresholdContextFields = (
  data: unknown
): MetaBoostCapabilityThresholdContext => {
  if (!isObjectLike(data)) {
    throw new Error('capability response must be an object');
  }

  return {
    preferredCurrency: parseOptionalNonEmptyString(
      getOwnPropertyValue(data, 'preferred_currency'),
      'preferred_currency'
    ),
    minimumMessageAmountMinor: parseOptionalNonNegativeInteger(
      getOwnPropertyValue(data, 'minimum_message_amount_minor'),
      'minimum_message_amount_minor'
    ),
    conversionEndpointUrl: parseOptionalHttpUrl(
      getOwnPropertyValue(data, 'conversion_endpoint_url'),
      'conversion_endpoint_url'
    ),
  };
};
