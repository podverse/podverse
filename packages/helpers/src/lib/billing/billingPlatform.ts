/**
 * Where a checkout starts. Each platform offers its own set of processors: store builds must sell
 * through their store, and `foss` (the F-Droid build) ships without store billing libraries.
 */
export const BILLING_PLATFORMS = ['web', 'ios', 'android', 'foss'] as const;

export type BillingPlatform = (typeof BILLING_PLATFORMS)[number];

export function isBillingPlatform(value: string): value is BillingPlatform {
  return BILLING_PLATFORMS.some((platform) => platform === value);
}
