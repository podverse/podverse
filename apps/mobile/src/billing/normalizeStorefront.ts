/** Checkout-options accepts an ISO 3166-1 alpha-2 storefront; anything else is omitted. */
export const normalizeStorefrontCode = (value: string): string | null => {
  const code = value.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
};
