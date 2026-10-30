import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  hasShownSignInPushPrompt,
  markSignInPushPromptPending,
  markSignInPushPromptShown,
  takeSignInPushPromptPending,
} from './signInPushPrompt';

const ACCOUNT_ID = 'acct-one';
const OTHER_ACCOUNT_ID = 'acct-two';

describe('signInPushPrompt', () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is false before the account is marked and true only for that account after', () => {
    expect(hasShownSignInPushPrompt(ACCOUNT_ID)).toBe(false);
    markSignInPushPromptShown(ACCOUNT_ID);
    expect(hasShownSignInPushPrompt(ACCOUNT_ID)).toBe(true);
    expect(hasShownSignInPushPrompt(OTHER_ACCOUNT_ID)).toBe(false);
  });

  it('takes a pending sign-in once', () => {
    expect(takeSignInPushPromptPending()).toBe(false);
    markSignInPushPromptPending();
    expect(takeSignInPushPromptPending()).toBe(true);
    expect(takeSignInPushPromptPending()).toBe(false);
  });

  it('reads as shown when localStorage.getItem throws', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('localStorage is disabled');
    });
    expect(hasShownSignInPushPrompt(ACCOUNT_ID)).toBe(true);
  });
});
