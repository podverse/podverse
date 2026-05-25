import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

export const createObservabilityResource = (serviceName: string): Resource => {
  return new Resource({
    [ATTR_SERVICE_NAME]: serviceName.trim(),
  });
};
