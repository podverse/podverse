import type { AccountSignupMode, PublicClientConfig } from '@podverse/helpers';
import {
  ACCOUNT_SIGNUP_MODE_VALUES,
  PLAYLIST_TAG_MAX_PER_PLAYLIST,
  PLAYLIST_TAG_NAME_MAX_LENGTH,
} from '@podverse/helpers';

import type { WebConfig } from './index';

export type ResolvedWebConfig = WebConfig & {
  public: WebConfig['public'] & {
    playlistLimits: {
      maxPerPlaylist: number;
      nameMaxLength: number;
    };
  };
};

function isKnownSignupMode(value: unknown): value is AccountSignupMode {
  return ACCOUNT_SIGNUP_MODE_VALUES.some((mode) => mode === value);
}

export function applyPublicClientConfig(
  base: WebConfig,
  remote: PublicClientConfig | null
): ResolvedWebConfig {
  if (remote === null) {
    return {
      ...base,
      public: {
        ...base.public,
        playlistLimits: {
          maxPerPlaylist: PLAYLIST_TAG_MAX_PER_PLAYLIST,
          nameMaxLength: PLAYLIST_TAG_NAME_MAX_LENGTH,
        },
      },
    };
  }

  // A mode outside ACCOUNT_SIGNUP_MODE_VALUES stays on the env value.
  const signupMode = isKnownSignupMode(remote.instance.signupMode)
    ? remote.instance.signupMode
    : base.public.account.signupMode;

  return {
    ...base,
    public: {
      ...base.public,
      brand: {
        ...base.public.brand,
        name: remote.instance.brandName,
      },
      legal: {
        ...base.public.legal,
        name: remote.instance.legalName,
        terms: {
          ...base.public.legal.terms,
          version: remote.instance.termsVersion,
        },
        tasteProfileAgreement: {
          ...base.public.legal.tasteProfileAgreement,
          version: remote.instance.tasteProfileAgreementVersion,
        },
      },
      contact: {
        ...base.public.contact,
        email: remote.instance.contactEmail,
      },
      account: {
        ...base.public.account,
        signupMode,
        contactEmail: remote.instance.contactEmail,
      },
      stats: {
        ...base.public.stats,
        trackEventRetentionDays: remote.instance.statsRetentionDays,
      },
      playlistLimits: {
        maxPerPlaylist: remote.playlistLimits.maxPerPlaylist,
        nameMaxLength: remote.playlistLimits.nameMaxLength,
      },
    },
  };
}
