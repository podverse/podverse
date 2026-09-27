export function hasWebPurchasableProcessor(params: {
  processorIds: readonly string[];
  paypalClientId: string;
}): boolean {
  if (params.processorIds.includes('test')) {
    return true;
  }
  return params.processorIds.includes('paypal') && params.paypalClientId !== '';
}
