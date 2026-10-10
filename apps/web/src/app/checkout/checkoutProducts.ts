import type {
  BillingCadence,
  DTOBillingCheckoutOptions,
  DTOBillingCheckoutProduct,
} from '@podverse/helpers';

export function isBillingCadence(value: string): value is BillingCadence {
  return value === 'monthly' || value === 'annual';
}

export function checkoutProduct(
  options: DTOBillingCheckoutOptions,
  processorId: string,
  cadence: BillingCadence
): DTOBillingCheckoutProduct | null {
  const processor = options.processors.find((item) => item.processor_id === processorId);
  if (processor === undefined) {
    return null;
  }
  return processor.products.find((product) => product.cadence === cadence) ?? null;
}

export function offersProcessor(options: DTOBillingCheckoutOptions, processorId: string): boolean {
  return options.processors.some((item) => item.processor_id === processorId);
}
