import type { BulkFollowChannelsResponse } from '@podverse/helpers';

// Import directly from the request module (not the auth barrel) to avoid a cycle, mirroring
// accountRepository (AuthProvider → accountRepository → auth barrel → AuthProvider).
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { subscriptionsRepository } from './subscriptionsRepository';
import { clearSignupMergeEmail, readSignupMergeEmail } from './subscriptionsSignupMarker';
import { resolveSignupMergePlan } from './subscriptionsSignupPlan';
import type { MobileAuthRequestContext } from './types';

/**
 * Local subscriptions cross over to a server account exactly once: when the user creates an account
 * from this device (701). A later sign-in never pushes local subscriptions up — after sign-up the
 * account is the source of truth, so uploading whatever accumulated on the device since would let a
 * phone silently rewrite an account the user also uses on the web.
 *
 * Sign-up does not sign the user in, so the merge cannot run at sign-up itself. Instead sign-up
 * records the email it created and the next login claims it, provided the email matches. Either way
 * that login consumes the marker, so the merge window is exactly "the login right after the sign-up
 * on this device" and can never fire later by accident.
 *
 * Must run **before** `accountRepository.refresh`: that triggers `syncFromAccount`, which is the
 * step that makes the account authoritative over the local rows.
 */
export type SignupMergeOutcome =
  /** No pending sign-up on this device, a different account, or nothing local to push. */
  | { status: 'skipped' }
  /** Local subscriptions were pushed up. */
  | { status: 'merged'; response: BulkFollowChannelsResponse }
  /**
   * The push did not go through — most often because the account cannot create server-side follows
   * without a valid membership. Local subscriptions and the marker are both **kept**, so the merge
   * retries on the next login and nothing is lost in the meantime.
   */
  | { status: 'blocked' };

/**
 * Push this device's local subscriptions to a freshly created account, once.
 *
 * Never throws: a failed merge must not block a login, and local subscriptions are never dropped,
 * so failure is recoverable rather than lossy.
 */
export const runSignupSubscriptionMerge = async (
  email: string,
  context: MobileAuthRequestContext
): Promise<SignupMergeOutcome> => {
  const pendingEmail = await readSignupMergeEmail();
  const localChannelIdTexts =
    pendingEmail === null ? [] : await subscriptionsRepository.listDirectoryIdTexts();
  const plan = resolveSignupMergePlan({ loginEmail: email, localChannelIdTexts, pendingEmail });

  if (plan.action === 'none') {
    return { status: 'skipped' };
  }

  if (plan.action === 'clear') {
    await clearSignupMergeEmail();
    return { status: 'skipped' };
  }

  try {
    const response = await requestWithMobileAuthRefresh(context, async (api) =>
      api.reqAccountFollowChannelsBulk({ channel_id_texts: plan.channelIdTexts })
    );
    await clearSignupMergeEmail();
    return { status: 'merged', response };
  } catch (error) {
    console.warn('[subscriptions] sign-up merge did not complete; retries on next login', error);
    return { status: 'blocked' };
  }
};
