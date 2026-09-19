/**
 * The one-tap E2E login control is a test affordance, not a product control.
 *
 * Both gates are required: `__DEV__` so a release binary cannot render it, and
 * `EXPO_PUBLIC_MOBILE_E2E=1` so a normal Metro session does not either.
 */
export const isE2eQuickLoginEnabled = (params: { isDev: boolean; isE2e: boolean }): boolean => {
  return params.isDev && params.isE2e;
};
