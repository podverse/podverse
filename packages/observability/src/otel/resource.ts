import type { Resource } from '@opentelemetry/resources';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export const createObservabilityResource = (serviceName: string): Resource => {
  return resourceFromAttributes({
    [ATTR_SERVICE_NAME]: serviceName.trim(),
  });
};
