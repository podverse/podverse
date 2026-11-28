import { describe, expect, it } from 'vitest';

import type { PublicClientConfig } from '@podverse/helpers';
import { ACCOUNT_SIGNUP_MODE_USER_SIGNUP_EMAIL } from '@podverse/helpers';

import type { WebConfig } from './index';
import { applyPublicClientConfig } from './publicClientConfig';

const membership: PublicClientConfig['membership'] = {
  freeTrialExpirationSeconds: 0,
  premiumMembershipCostMonthly: 3,
  premiumMembershipCostAnnually: 30,
  maxAddByRSSFeeds: 5,
  trialAllowDirectoryAddByRSS: false,
  trialMaxManualRefreshesPerHour: 0,
  trialTrackStats: false,
  trialAllowNotifications: false,
  premiumAllowDirectoryAddByRSS: true,
  premiumMaxManualRefreshesPerHour: 0,
  premiumTrackStats: true,
  premiumAllowNotifications: true,
  freeTrialDays: 0,
  annuallySavingsPercent: 0,
  monthlyEquivalentAnnually: 36,
};

function fixtureConfig(): WebConfig {
  const config = {
    public: {
      brand: {
        name: 'Env Brand',
        domain: 'env.example',
      },
      contact: {
        email: 'env@example.com',
      },
      legal: {
        name: 'Env Legal',
        terms: { version: 'env-terms' },
        tasteProfileAgreement: { version: 'env-taste' },
      },
      stats: {
        trackEventRetentionDays: 30,
      },
      account: {
        signupMode: 'admin_only_username',
        contactEmail: 'env@example.com',
      },
    },
  };
  // Fixture covers the overlaid public fields. The merge spreads every other group through.
  return config as unknown as WebConfig;
}

function remoteConfig(
  signupMode: PublicClientConfig['instance']['signupMode']
): PublicClientConfig {
  return {
    membership,
    playlistLimits: {
      maxPerPlaylist: 8,
      nameMaxLength: 40,
    },
    instance: {
      brandName: 'Api Brand',
      legalName: 'Api Legal',
      contactEmail: 'api@example.com',
      signupMode,
      secondFactorMode: 'optional',
      termsVersion: 'api-terms',
      tasteProfileAgreementVersion: 'api-taste',
      statsRetentionDays: 14,
    },
  };
}

describe('applyPublicClientConfig', () => {
  it('keeps env instance fields and uses the helper playlist limits when the remote config is null', () => {
    const resolved = applyPublicClientConfig(fixtureConfig(), null);

    expect(resolved.public.brand.name).toBe('Env Brand');
    expect(resolved.public.brand.domain).toBe('env.example');
    expect(resolved.public.account.signupMode).toBe('admin_only_username');
    expect(resolved.public.contact.email).toBe('env@example.com');
    expect(resolved.public.account.contactEmail).toBe('env@example.com');
    expect(resolved.public.legal.name).toBe('Env Legal');
    expect(resolved.public.legal.terms.version).toBe('env-terms');
    expect(resolved.public.legal.tasteProfileAgreement.version).toBe('env-taste');
    expect(resolved.public.stats.trackEventRetentionDays).toBe(30);
    expect(resolved.public.playlistLimits).toEqual({
      maxPerPlaylist: 5,
      nameMaxLength: 50,
    });
  });

  it('replaces the instance fields and playlist limits from the payload', () => {
    const resolved = applyPublicClientConfig(
      fixtureConfig(),
      remoteConfig(ACCOUNT_SIGNUP_MODE_USER_SIGNUP_EMAIL)
    );

    expect(resolved.public.brand.name).toBe('Api Brand');
    expect(resolved.public.brand.domain).toBe('env.example');
    expect(resolved.public.account.signupMode).toBe('user_signup_email');
    expect(resolved.public.contact.email).toBe('api@example.com');
    expect(resolved.public.account.contactEmail).toBe('api@example.com');
    expect(resolved.public.legal.name).toBe('Api Legal');
    expect(resolved.public.legal.terms.version).toBe('api-terms');
    expect(resolved.public.legal.tasteProfileAgreement.version).toBe('api-taste');
    expect(resolved.public.stats.trackEventRetentionDays).toBe(14);
    expect(resolved.public.playlistLimits).toEqual({
      maxPerPlaylist: 8,
      nameMaxLength: 40,
    });
  });

  it('keeps the env signup mode when the payload mode is not one of the three modes', () => {
    const remote = remoteConfig(ACCOUNT_SIGNUP_MODE_USER_SIGNUP_EMAIL);
    Reflect.set(remote.instance, 'signupMode', 'not_a_mode');

    const resolved = applyPublicClientConfig(fixtureConfig(), remote);

    expect(resolved.public.account.signupMode).toBe('admin_only_username');
    expect(resolved.public.brand.name).toBe('Api Brand');
    expect(resolved.public.contact.email).toBe('api@example.com');
    expect(resolved.public.account.contactEmail).toBe('api@example.com');
    expect(resolved.public.legal.name).toBe('Api Legal');
    expect(resolved.public.legal.terms.version).toBe('api-terms');
    expect(resolved.public.legal.tasteProfileAgreement.version).toBe('api-taste');
    expect(resolved.public.stats.trackEventRetentionDays).toBe(14);
    expect(resolved.public.playlistLimits).toEqual({
      maxPerPlaylist: 8,
      nameMaxLength: 40,
    });
  });
});
