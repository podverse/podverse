// Catalog vocabulary: cadence, product codes, and the reasons a membership is extended. Processor,
// subscription, grant, and event types live in `lib/billing/`.

export type BillingCadence = 'monthly' | 'annual';

export const BILLING_PRODUCT_CODES = {
  membershipPremium: 'membership_premium',
} as const;

export type BillingProductCode = (typeof BILLING_PRODUCT_CODES)[keyof typeof BILLING_PRODUCT_CODES];

export const BILLING_EXTENSION_REASONS = {
  membershipClaimToken: 'membership_claim_token',
  premiumPayPalOrder: 'premium_paypal_order',
  adminMembershipDefault: 'admin_membership_default',
} as const;

export type BillingExtensionReason =
  (typeof BILLING_EXTENSION_REASONS)[keyof typeof BILLING_EXTENSION_REASONS];
