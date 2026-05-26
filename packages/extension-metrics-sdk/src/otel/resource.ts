import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

const parseResourceAttributes = (raw: string | undefined): Record<string, string> | undefined => {
  if (raw === undefined || raw.trim() === '') {
    return undefined;
  }

  const attributes: Record<string, string> = {};
  const pairs = raw.split(',');
  for (const pair of pairs) {
    const trimmedPair = pair.trim();
    if (trimmedPair === '') {
      continue;
    }
    const separatorIndex = trimmedPair.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    const key = trimmedPair.slice(0, separatorIndex).trim();
    const value = trimmedPair.slice(separatorIndex + 1).trim();
    if (key !== '' && value !== '') {
      attributes[key] = value;
    }
  }

  return Object.keys(attributes).length > 0 ? attributes : undefined;
};

export const buildExtensionResource = (
  serviceName: string,
  resourceAttributes: string | undefined
) => {
  const extra = parseResourceAttributes(resourceAttributes);
  return resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName,
    ...extra,
  });
};
