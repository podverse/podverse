import { getOwnPropertyValue, isObjectLike, parseNonEmptyString } from '@podverse/helpers';
import { parseHttpOrHttpsUrl } from '@podverse/helpers-validation';

export type MetaBoostCapabilityThresholdContext = {
  preferredCurrency: string | null;
  conversionEndpointUrl: string | null;
};

const parseOptionalNonEmptyString = (value: unknown, fieldName: string): string | null => {
  if (value === undefined || value === null) {
    return null;
  }
  if (typeof value !== 'string') {
    throw new Error(`${fieldName} must be a string when provided`);
  }
  const parsed = parseNonEmptyString(value);
  if (parsed === null) {
    throw new Error(`${fieldName} must be a non-empty string when provided`);
  }
  return parsed;
};

const parseOptionalHttpUrl = (value: unknown, fieldName: string): string | null => {
  const parsedString = parseOptionalNonEmptyString(value, fieldName);
  if (parsedString === null) {
    return null;
  }
  if (!parseHttpOrHttpsUrl(parsedString)) {
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

  // Strict policy: optional threshold fields may be omitted, but if provided
  // they must be valid. Invalid provided values hard-fail capability parsing.
  return {
    preferredCurrency: parseOptionalNonEmptyString(
      getOwnPropertyValue(data, 'preferred_currency'),
      'preferred_currency'
    ),
    conversionEndpointUrl: parseOptionalHttpUrl(
      getOwnPropertyValue(data, 'conversion_endpoint_url'),
      'conversion_endpoint_url'
    ),
  };
};
