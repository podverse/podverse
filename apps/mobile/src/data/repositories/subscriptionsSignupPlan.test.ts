import { describe, expect, it } from 'vitest';

import { resolveSignupMergePlan } from './subscriptionsSignupPlan';

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
