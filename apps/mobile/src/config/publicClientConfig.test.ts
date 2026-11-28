import { describe, expect, it } from 'vitest';

import type {
  MobilePublicClientConfigEnv,
  MobilePublicClientConfigRemote,
} from './publicClientConfig';
import { applyMobilePublicClientConfig } from './publicClientConfig';

const env: MobilePublicClientConfigEnv = {
  signupMode: 'user_signup_email',
  contactEmail: 'fixture@example.com',
};

const remote = (
  overrides: {
    brandName?: string;
    contactEmail?: string;
    maxPerPlaylist?: number;
    nameMaxLength?: number;
    signupMode?: string;
  } = {}
): MobilePublicClientConfigRemote => ({
  instance: {
    brandName: overrides.brandName ?? 'Podverse',
    contactEmail: overrides.contactEmail ?? 'owner@example.com',
    signupMode: overrides.signupMode ?? 'user_signup_email',
  },
  playlistLimits: {
    maxPerPlaylist: overrides.maxPerPlaylist ?? 5,
    nameMaxLength: overrides.nameMaxLength ?? 50,
  },
});

describe('applyMobilePublicClientConfig', () => {
  it('keeps env signup mode, contact email, and limits 5 and 50 when remote is null', () => {
    expect(applyMobilePublicClientConfig(null, env)).toMatchObject({
      contactEmail: 'fixture@example.com',
      playlistLimits: { maxPerPlaylist: 5, nameMaxLength: 50 },
      signupMode: 'user_signup_email',
    });
  });

  it('replaces signup mode, contact email, and limits from a valid payload', () => {
    const applied = applyMobilePublicClientConfig(
      remote({
        contactEmail: 'contact@example.com',
        maxPerPlaylist: 8,
        nameMaxLength: 40,
        signupMode: 'admin_only_username',
      }),
      env
    );

    expect(applied.signupMode).toBe('admin_only_username');
    expect(applied.contactEmail).toBe('contact@example.com');
    expect(applied.playlistLimits).toEqual({ maxPerPlaylist: 8, nameMaxLength: 40 });
  });

  it('keeps the env signup mode when the payload mode is unknown', () => {
    const applied = applyMobilePublicClientConfig(remote({ signupMode: 'not-a-mode' }), env);

    expect(applied.signupMode).toBe('user_signup_email');
  });

  it('keeps the env contact email when the payload address is not a mailbox', () => {
    const applied = applyMobilePublicClientConfig(remote({ contactEmail: 'not-an-email' }), env);

    expect(applied.contactEmail).toBe('fixture@example.com');
  });

  it('keeps a non-empty brand and drops a blank one', () => {
    const named = applyMobilePublicClientConfig(remote({ brandName: '  Fork  ' }), env);
    const blank = applyMobilePublicClientConfig(remote({ brandName: '' }), env);

    expect(named.brandName).toBe('Fork');
    expect(blank.brandName).toBeNull();
  });
});
