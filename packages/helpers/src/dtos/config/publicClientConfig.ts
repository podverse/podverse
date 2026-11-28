import type { AccountSignupMode } from '../../lib/accountSignupMode.js';
import type { SecondFactorMode } from '../../lib/secondFactor.js';
import type { ResolvedProductMembership } from '../../lib/productMembershipDefaultsFromEnv.js';

export type PublicClientConfigMembership = ResolvedProductMembership & {
  freeTrialDays: number;
  annuallySavingsPercent: number;
  monthlyEquivalentAnnually: number;
};

export type PublicClientConfigPlaylistLimits = {
  maxPerPlaylist: number;
  nameMaxLength: number;
};

export type PublicClientConfigInstance = {
  brandName: string;
  legalName: string;
  contactEmail: string;
  signupMode: AccountSignupMode;
  secondFactorMode: SecondFactorMode;
  termsVersion: string;
  tasteProfileAgreementVersion: string;
  statsRetentionDays: number;
};

export type PublicClientConfig = {
  membership: PublicClientConfigMembership;
  playlistLimits: PublicClientConfigPlaylistLimits;
  instance: PublicClientConfigInstance;
};

export const PUBLIC_CLIENT_CONFIG_TIMEOUT_MS = 2000;
