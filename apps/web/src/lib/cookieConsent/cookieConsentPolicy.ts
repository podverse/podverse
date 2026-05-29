import type {
  CookieConsentChoice,
  CookieConsentState,
} from '../../utils/localSettings/localSettings';

export const COOKIE_CONSENT_MODEL_VERSION = 2 as const;

type LegacyCookieConsentChoice = 'all' | 'features' | 'essential';

function isLegacyCookieConsentChoice(choice: unknown): choice is LegacyCookieConsentChoice {
  return choice === 'all' || choice === 'features' || choice === 'essential';
}

function isCurrentCookieConsentChoice(choice: unknown): choice is CookieConsentChoice {
  return choice === 'all' || choice === 'essential' || choice === 'none';
}

export function normalizeCookieConsentChoice(choice: unknown): CookieConsentChoice | undefined {
  if (isCurrentCookieConsentChoice(choice)) {
    return choice;
  }
  if (choice === 'features') {
    return 'essential';
  }
  return undefined;
}

export function normalizeCookieConsentState(cc: {
  choice: unknown;
  at: string;
  v?: unknown;
}): CookieConsentState | undefined {
  if (typeof cc.at !== 'string' || cc.at.length === 0) {
    return undefined;
  }

  if (cc.v === COOKIE_CONSENT_MODEL_VERSION && isCurrentCookieConsentChoice(cc.choice)) {
    return { choice: cc.choice, at: cc.at, v: COOKIE_CONSENT_MODEL_VERSION };
  }

  if (isLegacyCookieConsentChoice(cc.choice)) {
    if (cc.choice === 'all') {
      return { choice: 'all', at: cc.at, v: COOKIE_CONSENT_MODEL_VERSION };
    }
    if (cc.choice === 'features') {
      return { choice: 'essential', at: cc.at, v: COOKIE_CONSENT_MODEL_VERSION };
    }
    return { choice: 'none', at: cc.at, v: COOKIE_CONSENT_MODEL_VERSION };
  }

  return undefined;
}

export function cookieConsentAllowsWebAnalytics(
  bannerEnabled: boolean,
  consent: CookieConsentState | undefined
): boolean {
  if (!bannerEnabled) {
    return true;
  }
  return consent?.choice === 'all';
}

export function cookieConsentAllowsAnonymousFeatureStorage(
  bannerEnabled: boolean,
  consent: CookieConsentState | undefined
): boolean {
  if (!bannerEnabled) {
    return true;
  }
  if (consent === undefined) {
    return false;
  }
  return consent.choice === 'all' || consent.choice === 'essential';
}
