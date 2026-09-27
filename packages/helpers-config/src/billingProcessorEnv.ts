import type { ValidationResult } from '@podverse/helpers';
import { parseExpirationEnvValue, validateBooleanValue } from '@podverse/helpers';

type EnvSource = Record<string, string | undefined>;

export type BillingPayPalEnvironment = 'sandbox' | 'live';

export interface BillingPayPalProcessorEnv {
  clientId: string;
  clientSecret: string;
  webhookId: string;
  /** Unset lets the PayPal package pick from `NODE_ENV`. */
  environment: BillingPayPalEnvironment | undefined;
}

export interface BillingAppleProcessorEnv {
  issuerId: string;
  keyId: string;
  privateKeyPath: string;
  bundleId: string;
  appAppleId: number | undefined;
  /** Unset lets the Apple package pick from `NODE_ENV`. */
  environment: string | undefined;
}

export interface BillingGooglePlayProcessorEnv {
  packageName: string;
  serviceAccountJsonPath: string;
  rtdnPushAudience: string;
  rtdnPushServiceAccountEmail: string;
}

/** Each processor is null unless its enable flag is `true` and every key it needs is set. */
export interface BillingProcessorEnv {
  paypal: BillingPayPalProcessorEnv | null;
  apple: BillingAppleProcessorEnv | null;
  googlePlay: BillingGooglePlayProcessorEnv | null;
}

interface BillingProcessorEnvGroup {
  label: string;
  category: string;
  enabledFlagKey: string;
  requiredKeys: readonly string[];
}

/**
 * A processor runs only when its flag is `true`. Credentials alone never turn it on.
 */
export const BILLING_PROCESSOR_ENV_GROUPS = {
  paypal: {
    label: 'PayPal',
    category: 'Billing / PayPal',
    enabledFlagKey: 'BILLING_PAYPAL_ENABLED',
    requiredKeys: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'],
  },
  apple: {
    label: 'Apple IAP',
    category: 'Billing / Apple IAP',
    enabledFlagKey: 'BILLING_APPLE_IAP_ENABLED',
    requiredKeys: [
      'APPLE_IAP_ISSUER_ID',
      'APPLE_IAP_KEY_ID',
      'APPLE_IAP_PRIVATE_KEY_PATH',
      'APPLE_IAP_BUNDLE_ID',
    ],
  },
  googlePlay: {
    label: 'Google Play',
    category: 'Billing / Google Play',
    enabledFlagKey: 'BILLING_GOOGLE_PLAY_ENABLED',
    requiredKeys: [
      'GOOGLE_PLAY_PACKAGE_NAME',
      'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH',
      'GOOGLE_PLAY_RTDN_PUSH_AUDIENCE',
      'GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL',
    ],
  },
} as const satisfies Record<keyof BillingProcessorEnv, BillingProcessorEnvGroup>;

function readTrimmed(env: EnvSource, key: string): string | undefined {
  const value = env[key]?.trim();
  return value === undefined || value === '' ? undefined : value;
}

/** True only for the value `true`, compared case-insensitively. Empty, unset, and `false` are off. */
export function isBillingProcessorFlagOn(
  env: Record<string, string | undefined>,
  group: { readonly enabledFlagKey: string }
): boolean {
  return readTrimmed(env, group.enabledFlagKey)?.toLowerCase() === 'true';
}

/** Calls `build` only when the flag is on and every required key is set. */
function readProcessor<T>(
  env: EnvSource,
  group: BillingProcessorEnvGroup,
  build: (value: (key: string) => string) => T
): T | null {
  if (!isBillingProcessorFlagOn(env, group)) {
    return null;
  }
  if (!group.requiredKeys.every((key) => readTrimmed(env, key) !== undefined)) {
    return null;
  }
  return build((key) => readTrimmed(env, key) ?? '');
}

function parsePayPalEnvironment(value: string | undefined): BillingPayPalEnvironment | undefined {
  const normalized = value?.toLowerCase();
  return normalized === 'sandbox' || normalized === 'live' ? normalized : undefined;
}

function parsePositiveInteger(value: string | undefined): number | undefined {
  if (value === undefined || !/^\d+$/.test(value)) {
    return undefined;
  }
  const parsed = Number(value);
  return parsed > 0 ? parsed : undefined;
}

/** Reads each processor's settings. A flag that is off, or a missing required key, comes back null. */
export function readBillingProcessorEnv(env: EnvSource): BillingProcessorEnv {
  return {
    paypal: readProcessor(env, BILLING_PROCESSOR_ENV_GROUPS.paypal, (value) => ({
      clientId: value('PAYPAL_CLIENT_ID'),
      clientSecret: value('PAYPAL_CLIENT_SECRET'),
      webhookId: value('PAYPAL_WEBHOOK_ID'),
      environment: parsePayPalEnvironment(readTrimmed(env, 'PAYPAL_ENVIRONMENT')),
    })),
    apple: readProcessor(env, BILLING_PROCESSOR_ENV_GROUPS.apple, (value) => ({
      issuerId: value('APPLE_IAP_ISSUER_ID'),
      keyId: value('APPLE_IAP_KEY_ID'),
      privateKeyPath: value('APPLE_IAP_PRIVATE_KEY_PATH'),
      bundleId: value('APPLE_IAP_BUNDLE_ID'),
      appAppleId: parsePositiveInteger(readTrimmed(env, 'APPLE_IAP_APP_APPLE_ID')),
      environment: readTrimmed(env, 'APPLE_IAP_ENVIRONMENT'),
    })),
    googlePlay: readProcessor(env, BILLING_PROCESSOR_ENV_GROUPS.googlePlay, (value) => ({
      packageName: value('GOOGLE_PLAY_PACKAGE_NAME'),
      serviceAccountJsonPath: value('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH'),
      rtdnPushAudience: value('GOOGLE_PLAY_RTDN_PUSH_AUDIENCE'),
      rtdnPushServiceAccountEmail: value('GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL'),
    })),
  };
}

function validateProcessorKey(
  env: EnvSource,
  key: string,
  group: BillingProcessorEnvGroup,
  enabled: boolean
): ValidationResult {
  const isSet = readTrimmed(env, key) !== undefined;
  if (!enabled && isSet) {
    return {
      name: key,
      isSet,
      isValid: true,
      isRequired: false,
      message: `Skipped - set ${group.enabledFlagKey}=true to enable ${group.label}`,
      category: group.category,
    };
  }
  if (isSet) {
    return {
      name: key,
      isSet,
      isValid: true,
      isRequired: enabled,
      message: 'Set',
      category: group.category,
    };
  }
  return {
    name: key,
    isSet,
    isValid: !enabled,
    isRequired: enabled,
    message: enabled
      ? `Required once ${group.label} is enabled`
      : `Skipped - ${group.label} not enabled`,
    category: group.category,
  };
}

/**
 * Same messages as `validateBoolean`. That helper reads `process.env`; these checks take an env
 * argument so a caller can validate a map that is not the process environment.
 */
function validateProcessorFlag(env: EnvSource, group: BillingProcessorEnvGroup): ValidationResult {
  return validateBooleanValue(env[group.enabledFlagKey], group.enabledFlagKey, group.category);
}

function validateOptionalChoice(
  env: EnvSource,
  key: string,
  category: string,
  allowed: readonly string[],
  notSetMessage: string
): ValidationResult {
  const value = readTrimmed(env, key);
  if (value === undefined) {
    return {
      name: key,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: notSetMessage,
      category,
    };
  }
  const isValid = allowed.includes(value.toLowerCase());
  return {
    name: key,
    isSet: true,
    isValid,
    isRequired: false,
    message: isValid ? `Using ${value}` : `Invalid value - use ${allowed.join(', ')}`,
    category,
  };
}

/** PayPal keys in `.env.example` order. */
export function validatePayPalProcessorEnv(env: EnvSource): ValidationResult[] {
  const group = BILLING_PROCESSOR_ENV_GROUPS.paypal;
  const enabled = isBillingProcessorFlagOn(env, group);
  return [
    validateProcessorFlag(env, group),
    validateProcessorKey(env, 'PAYPAL_CLIENT_ID', group, enabled),
    validateProcessorKey(env, 'PAYPAL_CLIENT_SECRET', group, enabled),
    validateOptionalChoice(
      env,
      'PAYPAL_ENVIRONMENT',
      group.category,
      ['sandbox', 'live'],
      'Use Default (live in production, sandbox otherwise)'
    ),
    validateProcessorKey(env, 'PAYPAL_WEBHOOK_ID', group, enabled),
  ];
}

/** Apple IAP keys in `.env.example` order. */
export function validateAppleProcessorEnv(env: EnvSource): ValidationResult[] {
  const group = BILLING_PROCESSOR_ENV_GROUPS.apple;
  const enabled = isBillingProcessorFlagOn(env, group);
  const appAppleIdRaw = readTrimmed(env, 'APPLE_IAP_APP_APPLE_ID');
  const appAppleIdValid =
    appAppleIdRaw === undefined || parsePositiveInteger(appAppleIdRaw) !== undefined;
  return [
    validateProcessorFlag(env, group),
    validateProcessorKey(env, 'APPLE_IAP_ISSUER_ID', group, enabled),
    validateProcessorKey(env, 'APPLE_IAP_KEY_ID', group, enabled),
    validateProcessorKey(env, 'APPLE_IAP_PRIVATE_KEY_PATH', group, enabled),
    validateProcessorKey(env, 'APPLE_IAP_BUNDLE_ID', group, enabled),
    {
      name: 'APPLE_IAP_APP_APPLE_ID',
      isSet: appAppleIdRaw !== undefined,
      isValid: appAppleIdValid,
      isRequired: false,
      message:
        appAppleIdRaw === undefined
          ? 'Skipped'
          : appAppleIdValid
            ? 'Set'
            : 'Invalid value - use the numeric App Store app id',
      category: group.category,
    },
    validateOptionalChoice(
      env,
      'APPLE_IAP_ENVIRONMENT',
      group.category,
      ['sandbox', 'production', 'prod', 'live'],
      'Use Default (production in production, sandbox otherwise)'
    ),
  ];
}

/** Google Play keys in `.env.example` order. */
export function validateGooglePlayProcessorEnv(env: EnvSource): ValidationResult[] {
  const group = BILLING_PROCESSOR_ENV_GROUPS.googlePlay;
  const enabled = isBillingProcessorFlagOn(env, group);
  return [
    validateProcessorFlag(env, group),
    ...group.requiredKeys.map((key) => validateProcessorKey(env, key, group, enabled)),
  ];
}

/** Buffer and grace windows are seconds; the ledger rejects anything but a non-negative integer. */
export function validateBillingExpirationEnv(
  env: EnvSource,
  key: string,
  defaultSeconds: number
): ValidationResult {
  const raw = readTrimmed(env, key);
  if (raw === undefined) {
    return {
      name: key,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: `Use Default (${defaultSeconds})`,
      category: 'Billing',
    };
  }
  try {
    parseExpirationEnvValue(raw);
    return {
      name: key,
      isSet: true,
      isValid: true,
      isRequired: false,
      message: 'Set',
      category: 'Billing',
    };
  } catch {
    return {
      name: key,
      isSet: true,
      isValid: false,
      isRequired: false,
      message: 'Invalid value - use a whole number of seconds',
      category: 'Billing',
    };
  }
}

const SANDBOX_ALLOWLIST_ENTRY = /^[A-Za-z0-9_-]+$/;

/** Comma-separated account ids or `id_text` values. */
export function validateBillingSandboxAllowlistEnv(env: EnvSource): ValidationResult {
  const key = 'BILLING_SANDBOX_ALLOWED_ACCOUNT_IDS';
  const raw = readTrimmed(env, key);
  if (raw === undefined) {
    return {
      name: key,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Skipped - no account gets access from sandbox purchases in production',
      category: 'Billing',
    };
  }
  const entries = raw
    .split(',')
    .map((entry) => entry.trim())
    .filter((entry) => entry !== '');
  const invalid = entries.filter((entry) => !SANDBOX_ALLOWLIST_ENTRY.test(entry));
  return {
    name: key,
    isSet: true,
    isValid: invalid.length === 0,
    isRequired: false,
    message:
      invalid.length === 0
        ? `${entries.length} account(s)`
        : 'Invalid value - use comma-separated account ids or id_text values',
    category: 'Billing',
  };
}
