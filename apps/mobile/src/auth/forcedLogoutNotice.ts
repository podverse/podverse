import { clearPref, getPref, setPref } from '../prefs/prefsStore';

/**
 * Why a session ended. Only the server can produce `session_expired`, and only that value shows the
 * user a notice.
 *
 * The distinction exists because a silent sign-out is dangerous: subscriptions made on a signed-out
 * device are local-only, and signing back into an existing account replaces the local list with the
 * account's (701). A user who keeps subscribing without realising they were signed out loses that
 * work at the next login, so they have to be told.
 */
export type SessionEndReason =
  /** The user chose to sign out. */
  | 'user_logout'
  /**
   * The API rejected this device's credentials with a 401 — an expired or revoked refresh token, or
   * a detected token reuse. Never inferred from a timeout, a network error, or a 5xx: those leave
   * the session intact so an offline device stays signed in.
   */
  | 'session_expired'
  /** A fixture or test harness wiped the session. Not a real sign-out; the user sees nothing. */
  | 'reset';

/**
 * Record that the server ended this session, so the notice survives to the next launch.
 *
 * Persisted rather than held in memory because the rejecting 401 usually lands on a background sync
 * with the app closed or backgrounded, where there is no one to show a modal to.
 */
export const markForcedLogout = async (occurredAt: Date = new Date()): Promise<void> => {
  await setPref('auth.forced_logout_at', occurredAt.toISOString());
};

/** Whether the user is owed a forced-logout notice. */
export const hasPendingForcedLogoutNotice = async (): Promise<boolean> => {
  const markedAt = await getPref('auth.forced_logout_at');
  return markedAt !== null && markedAt !== '';
};

/**
 * Consume the notice. Called when the user acknowledges it and when a login succeeds — a user who
 * signed back in before seeing it does not need telling.
 */
export const clearForcedLogoutNotice = async (): Promise<void> => {
  await clearPref('auth.forced_logout_at');
};

/** Whether ending a session for this reason owes the user a notice. */
export const shouldNotifyForcedLogout = (reason: SessionEndReason): boolean => {
  return reason === 'session_expired';
};
