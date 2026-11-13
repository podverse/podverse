/* eslint-disable no-console */
/**
 * Startup validation module - console output is intentional for startup diagnostics.
 * This module validates environment variables before the application starts.
 *
 * Every check reads from the env it is given, so the same checks validate this process at startup
 * and list the keys a start requires for any env (`getRequiredEnvKeys`, which the k8s env contract
 * test uses).
 */

import {
  isBucketProvider,
  SUPPORTED_BUCKET_PROVIDERS,
} from '@podverse/external-services-object-storage';
import {
  isValidUUID,
  validateAbsoluteHttpUrlValue,
  validateBooleanValue,
  validateOptionalValue,
  validatePositiveNumberValue,
  validateRequiredValue,
} from '@podverse/helpers';
import type { ValidationResult, ValidationSummary } from '@podverse/helpers-config';
import {
  displayValidationResultsSilent,
  isPodverseStartupValidationSilent,
  validateAppleProcessorEnv,
  validateBillingSandboxAllowlistEnv,
  validateGooglePlayProcessorEnv,
  validatePayPalProcessorEnv,
  validateStrikeProcessorEnv,
} from '@podverse/helpers-config';
import { buildObservabilityValidationResults } from '@podverse/observability/config';

/**
 * `node dist/index.js adminSessionPurge` purges admin sessions and exits. It connects to the
 * management database only, so it does not need KeyValDB.
 */
export const ADMIN_SESSION_PURGE_COMMAND = 'adminSessionPurge';

type StartupEnv = NodeJS.ProcessEnv;

function validateRequired(env: StartupEnv, name: string, category: string): ValidationResult {
  return validateRequiredValue(env[name], name, category);
}

function validateOptional(
  env: StartupEnv,
  name: string,
  category: string,
  defaultMessage = 'Skipped'
): ValidationResult {
  return validateOptionalValue(env[name], name, category, defaultMessage);
}

function validateBoolean(env: StartupEnv, name: string, category: string): ValidationResult {
  return validateBooleanValue(env[name], name, category);
}

function validateOptionalAbsoluteHttpUrlIfSet(
  env: StartupEnv,
  name: string,
  category: string,
  notSetMessage = 'Skipped'
): ValidationResult {
  return validateAbsoluteHttpUrlValue(env[name], name, category, {
    notSetMessage,
    required: false,
  });
}

/**
 * Env var names a start requires when its environment is `env`. `command` is the first CLI
 * argument (`adminSessionPurge`), or undefined when the process serves the API.
 */
export function getRequiredEnvKeys(env: NodeJS.ProcessEnv, command?: string): string[] {
  const required = validateAllEnvironmentVariables(env, command)
    .results.filter((result) => result.isRequired)
    .map((result) => result.name);
  return [...new Set(required)];
}

/**
 * Validates critical environment variables and configuration at application startup.
 * This function runs early in the initialization process to catch configuration errors
 * before the application attempts to start serving requests.
 *
 * @param command - First CLI argument, when the process runs a one-shot command
 * @throws Error if any critical validation fails
 */
export const validateStartupRequirements = (command?: string): void => {
  const silent = isPodverseStartupValidationSilent();

  if (!silent) {
    console.log('Running startup validation...');
  }

  const summary = validateAllEnvironmentVariables(process.env, command);
  if (silent) {
    displayValidationResultsSilent(summary);
  } else {
    displayValidationResults(summary);
  }

  if (summary.requiredMissing > 0) {
    const errorMessage = `FATAL: ${summary.requiredMissing} required environment variable(s) are missing or invalid. Please check the validation output above for details.`;
    console.error(errorMessage);
    // index.ts exits with EXIT_CODE_CONFIG_INVALID on this error, without a stack trace
    throw new Error(errorMessage);
  }

  if (!silent) {
    console.log('Startup validation completed successfully');
  }
};

/**
 * Validates all environment variables and returns a comprehensive summary
 */
const validateAllEnvironmentVariables = (env: StartupEnv, command?: string): ValidationSummary => {
  const results: ValidationResult[] = [];

  // Auth & Security
  results.push(validateJwtSecret(env));
  results.push(
    validateOptional(
      env,
      'AUTH_SESSION_IDLE_EXPIRATION',
      'Auth & Security',
      'Blank uses default (31536000 seconds)'
    )
  );
  results.push(
    validateOptional(
      env,
      'AUTH_ACCESS_TOKEN_EXPIRATION',
      'Auth & Security',
      'Blank uses default (900 seconds)'
    )
  );
  results.push(
    validateOptional(
      env,
      'AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY',
      'Auth & Security',
      'Blank/false: omit token from login JSON; true: allow token when client sends includeTokenInResponseBody'
    )
  );
  results.push(validateRequired(env, 'BRAND_NAME', 'Auth & Security'));
  results.push(validateUserAgent(env));
  results.push(validateAdminSessionRetentionDays(env));

  // One Postgres instance: shared host/port; DB_APP_* and DB_MANAGEMENT_* name each database and its roles.
  results.push(validateRequired(env, 'DB_HOST', 'Postgres'));
  results.push(validateRequired(env, 'DB_PORT', 'Postgres'));
  results.push(validateOptional(env, 'DB_SSL_CONNECTION', 'Postgres', 'Use Default (false)'));

  // Main app database
  results.push(validateRequired(env, 'DB_APP_NAME', 'App Database'));
  results.push(validateRequired(env, 'DB_APP_READ_USER', 'App Database'));
  results.push(validateRequired(env, 'DB_APP_READ_PASSWORD', 'App Database'));
  results.push(validateRequired(env, 'DB_APP_READ_WRITE_USER', 'App Database'));
  results.push(validateRequired(env, 'DB_APP_READ_WRITE_PASSWORD', 'App Database'));

  // Management (admin) database
  results.push(validateRequired(env, 'DB_MANAGEMENT_NAME', 'Management Database'));
  results.push(validateRequired(env, 'DB_MANAGEMENT_READ_USER', 'Management Database'));
  results.push(validateRequired(env, 'DB_MANAGEMENT_READ_PASSWORD', 'Management Database'));
  results.push(validateRequired(env, 'DB_MANAGEMENT_READ_WRITE_USER', 'Management Database'));
  results.push(validateRequired(env, 'DB_MANAGEMENT_READ_WRITE_PASSWORD', 'Management Database'));

  // KeyValDB (account event publishing). adminSessionPurge exits before the publisher starts.
  for (const key of ['KEYVALDB_HOST', 'KEYVALDB_PORT', 'KEYVALDB_PASSWORD']) {
    results.push(
      command === ADMIN_SESSION_PURGE_COMMAND
        ? validateOptional(env, key, 'KeyValDB', `Skipped (${ADMIN_SESSION_PURGE_COMMAND})`)
        : validateRequired(env, key, 'KeyValDB')
    );
  }

  // API Configuration
  results.push(validateRequired(env, 'API_PORT', 'API'));
  results.push(validateRequired(env, 'API_PREFIX', 'API'));
  results.push(validateRequired(env, 'API_VERSION', 'API'));
  results.push(validateRequired(env, 'API_RELEASE', 'API'));
  results.push(validateRequired(env, 'COOKIE_DOMAIN', 'API'));
  results.push(validateRequired(env, 'API_ALLOWED_CORS_ORIGINS', 'API'));

  // Web origins (public web vs management web — different invite-link bases)
  results.push(validateRequired(env, 'APP_WEB_PROTOCOL', 'Web (main app)'));
  results.push(validateRequired(env, 'APP_WEB_DOMAIN', 'Web (main app)'));
  results.push(validateRequired(env, 'MANAGEMENT_WEB_PROTOCOL', 'Web (management app)'));
  results.push(validateRequired(env, 'MANAGEMENT_WEB_DOMAIN', 'Web (management app)'));

  // User Management
  results.push(
    validateOptional(
      env,
      'MANAGEMENT_API_SET_PASSWORD_EXPIRATION',
      'User Management',
      'Blank uses default (604800 seconds)'
    )
  );
  results.push(
    validateOptional(
      env,
      'MEMBERSHIP_FREE_TRIAL_EXPIRATION',
      'Membership',
      'Blank uses default trial duration (31 days in seconds); when set, integer seconds'
    )
  );
  results.push(
    validateOptional(
      env,
      'MEMBERSHIP_MAX_ADD_BY_RSS_FEEDS',
      'Membership',
      'Blank uses default (100); Trial and Premium share it'
    )
  );
  results.push(
    validateOptional(
      env,
      'MEMBERSHIP_PREMIUM_COST_MONTHLY',
      'Membership pricing',
      'Optional; aligns with main API pricing env'
    )
  );
  results.push(
    validateOptional(
      env,
      'MEMBERSHIP_PREMIUM_COST_ANNUALLY',
      'Membership pricing',
      'Optional; aligns with main API pricing env'
    )
  );

  results.push(...validateObjectStorageBucket(env));

  // Billing (optional; each processor runs only when its *_ENABLED flag is "true", and then
  // every key it needs is required). Account resync re-reads transactions through these.
  results.push(validateBillingSandboxAllowlistEnv(env));
  results.push(validateBoolean(env, 'BILLING_SANDBOX_GRANT_ALL', 'Billing'));
  results.push(validateBoolean(env, 'BILLING_ALLOW_TEST_ADAPTER', 'Billing'));
  results.push(...validatePayPalProcessorEnv(env));
  results.push(...validateAppleProcessorEnv(env));
  results.push(...validateGooglePlayProcessorEnv(env));
  results.push(...validateStrikeProcessorEnv(env));

  // General
  results.push(validateRequired(env, 'NODE_ENV', 'General'));
  results.push(validateRequired(env, 'LOG_LEVEL', 'General'));

  results.push(...buildObservabilityValidationResults(env));

  // Extensions (sidecar — separate container) — last in apps/management-api/.env.example; OpenTelemetry export, then Prometheus extension
  const metricsExtensionEnabled = env.PROMETHEUS_ENABLED === 'true';
  if (metricsExtensionEnabled) {
    results.push(
      validateRequired(env, 'OTEL_EXPORTER_OTLP_ENDPOINT', 'Extensions / OpenTelemetry')
    );
    results.push(validateRequired(env, 'OTEL_SERVICE_NAME', 'Extensions / OpenTelemetry'));
    results.push(
      validateOptional(env, 'OTEL_RESOURCE_ATTRIBUTES', 'Extensions / OpenTelemetry', 'Skipped')
    );
  } else {
    results.push(
      validateOptional(
        env,
        'OTEL_EXPORTER_OTLP_ENDPOINT',
        'Extensions / OpenTelemetry',
        'Skipped (extensions disabled)'
      )
    );
    results.push(
      validateOptional(
        env,
        'OTEL_SERVICE_NAME',
        'Extensions / OpenTelemetry',
        'Skipped (extensions disabled)'
      )
    );
    results.push(
      validateOptional(
        env,
        'OTEL_RESOURCE_ATTRIBUTES',
        'Extensions / OpenTelemetry',
        'Skipped (extensions disabled)'
      )
    );
  }
  results.push(
    validateOptional(
      env,
      'PROMETHEUS_ENABLED',
      'Extensions / Prometheus',
      'Blank/false: disabled; true: enable sidecar — set OTEL_* when true'
    )
  );

  // Calculate summary
  const total = results.length;
  const passed = results.filter((r) => r.isValid && r.isSet).length;
  const failed = results.filter((r) => !r.isValid).length;
  const requiredMissing = results.filter((r) => r.isRequired && !r.isValid).length;
  // Count as skipped all optional variables that are not set (regardless of message)
  const skipped = results.filter((r) => !r.isRequired && !r.isSet).length;
  // Count defaults used (passed validations with "Use Default" or "Blank" messages)
  const defaultsUsed = results.filter(
    (r) => r.isValid && r.isSet && (r.message.includes('Use Default') || r.message === 'Blank')
  ).length;

  return {
    total,
    passed,
    failed,
    requiredMissing,
    skipped,
    defaultsUsed,
    results,
  };
};

/**
 * Validates the AUTH_JWT_SECRET environment variable.
 * The JWT secret MUST be a valid UUID to ensure secure token generation.
 */
const validateJwtSecret = (env: StartupEnv): ValidationResult => {
  const jwtSecret = env.AUTH_JWT_SECRET || '';

  if (!jwtSecret) {
    return {
      name: 'AUTH_JWT_SECRET',
      isSet: false,
      isValid: false,
      isRequired: true,
      message: 'Missing - must be a valid UUID',
      category: 'Auth & Security',
    };
  }

  if (!isValidUUID(jwtSecret)) {
    return {
      name: 'AUTH_JWT_SECRET',
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid UUID format: "${jwtSecret}"`,
      category: 'Auth & Security',
    };
  }

  return {
    name: 'AUTH_JWT_SECRET',
    isSet: true,
    isValid: true,
    isRequired: true,
    message: 'Valid UUID',
    category: 'Auth & Security',
  };
};

/**
 * Blank keeps the default window. Anything else must be a number of days, so a unit mistake
 * (seconds pasted into a field counted in days) fails at startup.
 */
const validateAdminSessionRetentionDays = (env: StartupEnv): ValidationResult => {
  const value = env.ADMIN_SESSION_RETENTION_DAYS ?? '';
  if (value.trim() === '') {
    return {
      name: 'ADMIN_SESSION_RETENTION_DAYS',
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Use Default (30 days)',
      category: 'Auth & Security',
    };
  }
  return validatePositiveNumberValue(
    value,
    'ADMIN_SESSION_RETENTION_DAYS',
    'Auth & Security',
    false,
    1,
    3650
  );
};

const USER_AGENT_PATTERN = /^[^/]+\/[^/]+\/[^/]+$/;

/**
 * Validates `USER_AGENT` (required, non-blank; no inference from `BRAND_NAME`).
 * Format: `BrandName Bot Environment/AppName/Version`, e.g. `Example Bot/Management-API/5`
 */
const validateUserAgent = (env: StartupEnv): ValidationResult => {
  const raw = (env.USER_AGENT ?? '').trim();
  if (raw === '') {
    return {
      name: 'USER_AGENT',
      isSet: false,
      isValid: false,
      isRequired: true,
      message: 'Missing (required)',
      category: 'Auth & Security',
    };
  }

  if (!USER_AGENT_PATTERN.test(raw)) {
    return {
      name: 'USER_AGENT',
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid format: "${raw}" - must follow format: BrandName Bot Environment/AppName/Version`,
      category: 'Auth & Security',
    };
  }

  const firstPart = raw.split('/')[0];
  if (firstPart && !firstPart.toLowerCase().includes('bot')) {
    return {
      name: 'USER_AGENT',
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Missing "Bot" in first part: "${raw}"`,
      category: 'Auth & Security',
    };
  }

  return {
    name: 'USER_AGENT',
    isSet: true,
    isValid: true,
    isRequired: true,
    message: 'Valid format',
    category: 'Auth & Security',
  };
};

const OBJECT_STORAGE_CATEGORY = 'Object Storage';

function validateManagementBucketForcePathStyle(env: StartupEnv): ValidationResult {
  const raw = (env.BUCKET_FORCE_PATH_STYLE ?? '').trim();
  if (raw === '') {
    return {
      name: 'BUCKET_FORCE_PATH_STYLE',
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Use Default (provider-specific)',
      category: OBJECT_STORAGE_CATEGORY,
    };
  }
  if (raw === 'true' || raw === 'false') {
    return {
      name: 'BUCKET_FORCE_PATH_STYLE',
      isSet: true,
      isValid: true,
      isRequired: false,
      message: `Set (${raw})`,
      category: OBJECT_STORAGE_CATEGORY,
    };
  }
  return {
    name: 'BUCKET_FORCE_PATH_STYLE',
    isSet: true,
    isValid: false,
    isRequired: false,
    message: `Invalid value: "${raw}" (expected true, false, or unset)`,
    category: OBJECT_STORAGE_CATEGORY,
  };
}

/**
 * When `BUCKET_PROVIDER` is unset, object storage management routes stay disabled.
 * When set, validate the same bucket env contract as workers (including `BUCKET_CDN_BASE_URL`).
 */
function validateObjectStorageBucket(env: StartupEnv): ValidationResult[] {
  const results: ValidationResult[] = [];
  const bucketProvider = env.BUCKET_PROVIDER?.trim() ?? '';
  if (bucketProvider === '') {
    results.push(
      validateOptional(
        env,
        'BUCKET_PROVIDER',
        OBJECT_STORAGE_CATEGORY,
        'Disabled - BUCKET_PROVIDER not set'
      )
    );
    return results;
  }

  const isBucketProviderValid = isBucketProvider(bucketProvider);
  const providerList = SUPPORTED_BUCKET_PROVIDERS.join(', ');
  results.push({
    name: 'BUCKET_PROVIDER',
    isSet: true,
    isValid: isBucketProviderValid,
    isRequired: true,
    message: isBucketProviderValid
      ? 'Set'
      : `Invalid value: "${bucketProvider}" (expected one of: ${providerList})`,
    category: OBJECT_STORAGE_CATEGORY,
  });

  results.push(validateRequired(env, 'BUCKET_ACCESS_KEY', OBJECT_STORAGE_CATEGORY));
  results.push(validateRequired(env, 'BUCKET_SECRET_KEY', OBJECT_STORAGE_CATEGORY));
  results.push(validateRequired(env, 'BUCKET_REGION', OBJECT_STORAGE_CATEGORY));
  results.push(validateRequired(env, 'BUCKET_NAME', OBJECT_STORAGE_CATEGORY));
  results.push(validateRequired(env, 'BUCKET_CDN_BASE_URL', OBJECT_STORAGE_CATEGORY));

  if (isBucketProviderValid) {
    if (bucketProvider === 'garage' || bucketProvider === 's3-compatible') {
      results.push(validateRequired(env, 'BUCKET_ENDPOINT', OBJECT_STORAGE_CATEGORY));
    } else {
      results.push(
        validateOptional(
          env,
          'BUCKET_ENDPOINT',
          OBJECT_STORAGE_CATEGORY,
          'Optional override for S3 API base URL (see docs/image-shrinking/BUCKET-PROVIDERS.md)'
        )
      );
    }
    results.push(
      validateOptionalAbsoluteHttpUrlIfSet(
        env,
        'BUCKET_ENDPOINT',
        OBJECT_STORAGE_CATEGORY,
        'Skipped'
      )
    );
  }

  results.push(validateManagementBucketForcePathStyle(env));
  return results;
}

/**
 * Displays validation results in a formatted table
 */
const displayValidationResults = (summary: ValidationSummary): void => {
  console.log('=== Environment Variable Validation ===');

  // Group results by category
  const byCategory: Record<string, ValidationResult[]> = {};
  for (const result of summary.results) {
    const category = result.category;
    const categoryList = byCategory[category] ?? (byCategory[category] = []);
    categoryList.push(result);
  }

  // Display by category
  const categories = Object.keys(byCategory).sort();
  for (const category of categories) {
    console.log(`[${category}]`);
    const categoryResults = byCategory[category];
    if (!categoryResults) {
      continue;
    }
    for (const result of categoryResults) {
      const status = result.isValid ? '✓' : '✗';
      const requiredText = result.isRequired ? '' : ' (optional)';
      const logMessage = `  ${status} ${result.name}${requiredText} - ${result.message}`;
      // Log failures as errors, skipped optional vars as warn, passes as info
      if (!result.isValid) {
        console.error(logMessage);
      } else if (!result.isSet && !result.isRequired) {
        console.warn(logMessage);
      } else {
        console.log(logMessage);
      }
    }
  }

  // Display summary
  console.log('=== Validation Summary ===');
  console.log(`Total: ${summary.total}`);
  const passedText =
    summary.defaultsUsed > 0
      ? `Passed: ${summary.passed} (${summary.defaultsUsed} using defaults)`
      : `Passed: ${summary.passed}`;
  console.log(passedText);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Required Missing: ${summary.requiredMissing}`);

  if (summary.failed > 0) {
    console.error('The following environment variables failed validation:');
    summary.results
      .filter((r) => !r.isValid)
      .forEach((r) => {
        const requiredText = r.isRequired ? ' (required)' : ' (optional)';
        console.error(`  - ${r.name}${requiredText}: ${r.message}`);
      });
  }

  if (summary.skipped > 0) {
    console.log('Skipped optional variables (not set):');
    summary.results
      .filter((r) => !r.isRequired && !r.isSet)
      .forEach((r) => console.log(`  - ${r.name}`));
  }
};
