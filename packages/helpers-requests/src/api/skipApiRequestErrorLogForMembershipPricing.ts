const MEMBERSHIP_PRICING_PATH = '/product/membership/pricing';
const MEMBERSHIP_PRICING_DISABLED_MESSAGE =
  'Paid premium memberships are not enabled for this server';

const getResponseMessage = (responseData: unknown): string | undefined => {
  if (responseData !== null && typeof responseData === 'object') {
    const message = Reflect.get(responseData, 'message');
    if (typeof message === 'string') {
      return message;
    }
  }

  return undefined;
};

/**
 * Pricing is optional when paid memberships are disabled, so the API's structured 400 is expected.
 */
export function skipApiRequestErrorLogForMembershipPricing(
  errorInfo: { status?: number; responseData?: unknown },
  requestPath: string
): boolean {
  return (
    errorInfo.status === 400 &&
    requestPath === MEMBERSHIP_PRICING_PATH &&
    getResponseMessage(errorInfo.responseData) === MEMBERSHIP_PRICING_DISABLED_MESSAGE
  );
}
