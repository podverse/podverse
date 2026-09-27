import type { ValidationResult } from '@podverse/helpers';
import { parseExpirationEnvValue } from '@podverse/helpers';

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

/** Each processor is null unless every key it needs is set. */
export interface BillingProcessorEnv {
  paypal: BillingPayPalProcessorEnv | null;
  apple: BillingAppleProcessorEnv | null;
  googlePlay: BillingGooglePlayProcessorEnv | null;
}

interface BillingProcessorEnvGroup {
  label: string;
  category: string;
  /** Setting any of these turns the processor on, which makes every required key mandatory. */
  enableKeys: readonly string[];
  requiredKeys: readonly string[];
}

/**
 * Package and bundle ids ship with defaults in the env templates, so only credentials count as
 * turning a processor on.
 */
export const BILLING_PROCESSOR_ENV_GROUPS = {
  paypal: {
    label: 'PayPal',
    category: 'Billing / PayPal',
    enableKeys: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'],
    requiredKeys: ['PAYPAL_CLIENT_ID', 'PAYPAL_CLIENT_SECRET', 'PAYPAL_WEBHOOK_ID'],
  },
  apple: {
    label: 'Apple IAP',
    category: 'Billing / Apple IAP',
    enableKeys: ['APPLE_IAP_ISSUER_ID', 'APPLE_IAP_KEY_ID', 'APPLE_IAP_PRIVATE_KEY_PATH'],
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
    enableKeys: [
      'GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH',
      'GOOGLE_PLAY_RTDN_PUSH_AUDIENCE',
      'GOOGLE_PLAY_RTDN_PUSH_SERVICE_ACCOUNT_EMAIL',
    ],
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

function isProcessorEnabled(env: EnvSource, group: BillingProcessorEnvGroup): boolean {
  return group.enableKeys.some((key) => readTrimmed(env, key) !== undefined);
}

/** Calls `build` only when every required key is set, so `value` never returns an empty string. */
function readProcessor<T>(
  env: EnvSource,
  group: BillingProcessorEnvGroup,
  build: (value: (key: string) => string) => T
): T | null {
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

/** Reads each processor's settings; a processor with any required key missing comes back null. */
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
  const enabled = isProcessorEnabled(env, group);
  return [
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
  const enabled = isProcessorEnabled(env, group);
  const appAppleIdRaw = readTrimmed(env, 'APPLE_IAP_APP_APPLE_ID');
  const appAppleIdValid =
    appAppleIdRaw === undefined || parsePositiveInteger(appAppleIdRaw) !== undefined;
  return [
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
  const enabled = isProcessorEnabled(env, group);
  return group.requiredKeys.map((key) => validateProcessorKey(env, key, group, enabled));
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
