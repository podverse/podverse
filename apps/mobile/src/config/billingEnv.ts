/**
 * Store-billing mode as a process.env read with no React Native imports, so Expo config and Node
 * unit tests can load it. Literal `EXPO_PUBLIC_*` reads for the app also live in `env.ts`,
 * `e2eEnv.ts`, and `perfEnv.ts`.
 */

export type MobileBillingMode = 'store' | 'unavailable';

/**
 * Store billing is the default. UnifiedPush builds are the FOSS flavor and never open a store
 * sheet, even when `EXPO_PUBLIC_MOBILE_BILLING` is `store`.
 */
export const getMobileBillingModeFromEnv = (): MobileBillingMode => {
  const billing = process.env.EXPO_PUBLIC_MOBILE_BILLING?.trim();
  const push = process.env.EXPO_PUBLIC_MOBILE_PUSH_PROVIDER?.trim();
  if (billing === 'unavailable' || push === 'unifiedpush') {
    return 'unavailable';
  }
  return 'store';
};
