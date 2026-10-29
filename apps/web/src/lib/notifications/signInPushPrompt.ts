import {
  getSignInPushPromptShownStorageKey,
  SIGN_IN_PUSH_PROMPT_SHOWN_VALUE,
} from '@podverse/helpers';

const SIGN_IN_PUSH_PROMPT_PENDING_STORAGE_KEY = 'podverse.auth.sign_in_push_prompt_pending';

/**
 * Whether the sign-in push dialog was shown for this account in this browser. An unreadable
 * localStorage reads as shown, so a private window is not asked on every sign-in.
 */
export const hasShownSignInPushPrompt = (accountIdText: string): boolean => {
  if (typeof window === 'undefined') {
    return true;
  }
  try {
    return (
      window.localStorage.getItem(getSignInPushPromptShownStorageKey(accountIdText)) ===
      SIGN_IN_PUSH_PROMPT_SHOWN_VALUE
    );
  } catch {
    return true;
  }
};

export const markSignInPushPromptShown = (accountIdText: string): void => {
  try {
    window.localStorage.setItem(
      getSignInPushPromptShownStorageKey(accountIdText),
      SIGN_IN_PUSH_PROMPT_SHOWN_VALUE
    );
  } catch {
    // Private browsing can refuse localStorage; the next sign-in may ask again.
  }
};

/** Saves "this browser just signed in" for the page load after the sign-in reload. */
export const markSignInPushPromptPending = (): void => {
  try {
    window.sessionStorage.setItem(SIGN_IN_PUSH_PROMPT_PENDING_STORAGE_KEY, '1');
  } catch {
    // sessionStorage can be disabled; a failure means no sign-in dialog this time.
  }
};

/** Returns whether a sign-in is pending and clears it, so only one page load acts on it. */
export const takeSignInPushPromptPending = (): boolean => {
  try {
    const pending = window.sessionStorage.getItem(SIGN_IN_PUSH_PROMPT_PENDING_STORAGE_KEY);
    window.sessionStorage.removeItem(SIGN_IN_PUSH_PROMPT_PENDING_STORAGE_KEY);
    return pending === '1';
  } catch {
    return false;
  }
};
