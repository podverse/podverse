import { describe, expect, it } from 'vitest';

import { isSignupLoginFor, resolveSignupMergePlan } from './subscriptionsSignupPlan';

describe('isSignupLoginFor', () => {
  it('is false when no sign-up is pending', () => {
    expect(isSignupLoginFor(null, 'listener@example.com')).toBe(false);
  });

  it('matches the same email regardless of case or surrounding spaces', () => {
    expect(isSignupLoginFor('  Listener@Example.com ', 'listener@example.com')).toBe(true);
  });

  it('is false for a different email', () => {
    expect(isSignupLoginFor('listener@example.com', 'someone-else@example.com')).toBe(false);
  });
});

describe('resolveSignupMergePlan', () => {
  const localChannelIdTexts = ['channel-a', 'channel-b'];

  it('does nothing when no sign-up is pending on this device', () => {
    expect(
      resolveSignupMergePlan({
        loginEmail: 'listener@example.com',
        localChannelIdTexts,
        pendingEmail: null,
      })
    ).toEqual({ action: 'none' });
  });

  it('uploads the local subscriptions on the login that follows the sign-up', () => {
    expect(
      resolveSignupMergePlan({
        loginEmail: 'listener@example.com',
        localChannelIdTexts,
        pendingEmail: 'listener@example.com',
      })
    ).toEqual({ action: 'merge', channelIdTexts: localChannelIdTexts });
  });

  it('matches the account regardless of case or surrounding whitespace', () => {
    expect(
      resolveSignupMergePlan({
        loginEmail: '  Listener@Example.com ',
        localChannelIdTexts,
        pendingEmail: 'listener@example.com',
      })
    ).toEqual({ action: 'merge', channelIdTexts: localChannelIdTexts });
  });

  it('uploads nothing when a different account signs in, and closes the window', () => {
    expect(
      resolveSignupMergePlan({
        loginEmail: 'someone-else@example.com',
        localChannelIdTexts,
        pendingEmail: 'listener@example.com',
      })
    ).toEqual({ action: 'clear' });
  });

  it('closes the window when there is nothing local to upload', () => {
    expect(
      resolveSignupMergePlan({
        loginEmail: 'listener@example.com',
        localChannelIdTexts: [],
        pendingEmail: 'listener@example.com',
      })
    ).toEqual({ action: 'clear' });
  });

  it('does not upload on a second login, because the first consumed the marker', () => {
    const firstLogin = resolveSignupMergePlan({
      loginEmail: 'listener@example.com',
      localChannelIdTexts,
      pendingEmail: 'listener@example.com',
    });
    expect(firstLogin.action).toBe('merge');

    // The marker is cleared after a merge, so the next login sees no pending sign-up.
    expect(
      resolveSignupMergePlan({
        loginEmail: 'listener@example.com',
        localChannelIdTexts: [...localChannelIdTexts, 'channel-added-later'],
        pendingEmail: null,
      })
    ).toEqual({ action: 'none' });
  });
});
