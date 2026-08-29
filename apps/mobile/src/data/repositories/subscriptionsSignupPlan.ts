/**
 * The decision half of the sign-up subscription merge, kept free of `expo-sqlite` so the node-only
 * Vitest suite can cover it — the same split as `subscriptionsMerge` vs `subscriptionsRepository`.
 *
 * The rule this encodes (701): local subscriptions are pushed to a server account **only** by the
 * login immediately following a sign-up on this device. Any other login consumes the marker without
 * uploading, because after sign-up the account is the source of truth and a phone must not be able
 * to rewrite an account the user also uses elsewhere.
 */
export type SignupMergePlan =
  /** Upload these channels, then clear the marker. */
  | { action: 'merge'; channelIdTexts: string[] }
  /** Nothing to upload; clear the marker so the window closes. */
  | { action: 'clear' }
  /** No marker at all — this login has nothing to do with a sign-up. */
  | { action: 'none' };

export const normalizeSignupMergeEmail = (email: string): string => email.trim().toLowerCase();

export function resolveSignupMergePlan(params: {
  /** Email recorded at sign-up, or null when no sign-up is pending on this device. */
  pendingEmail: string | null;
  /** Email that just logged in. */
  loginEmail: string;
  /** Channel `id_text`s currently subscribed locally. */
  localChannelIdTexts: string[];
}): SignupMergePlan {
  const { loginEmail, localChannelIdTexts, pendingEmail } = params;

  if (pendingEmail === null) {
    return { action: 'none' };
  }

  // A different account closes the window rather than deferring it: leaving the marker would let a
  // merge fire on some unrelated later login.
  if (normalizeSignupMergeEmail(pendingEmail) !== normalizeSignupMergeEmail(loginEmail)) {
    return { action: 'clear' };
  }

  if (localChannelIdTexts.length === 0) {
    return { action: 'clear' };
  }

  return { action: 'merge', channelIdTexts: localChannelIdTexts };
}
