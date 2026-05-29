/* eslint-disable no-console */
/**
 * Startup validation for the workers app.
 *
 * **Command-first bootstrap**: The running command is determined from argv (see index.ts) before
 * any validation or config loading. Only that command's env vars are validated.
 *
 * **Per-job validators**: Each command has a set of config categories (Base, ORM, MQ, Parser,
 * PodcastIndex, WebNotifications). Categories are defined in categoriesForCommand.ts. This module
 * validates only the env vars for those categories; required vs optional per category is defined
 * in the validate* functions below.
 *
 * **Shared display**: Validation output uses the same format as api/management-api: categories,
 * checkmarks, summary, and a FATAL message with the list of missing required vars when validation
 * fails.
 *
 * **Adding a new command**: (1) Add the command in `@podverse/worker-commands` (re-exported from
 * commandNames). (2) Add
 * the command to the appropriate group(s) in categoriesForCommand.ts so it gets the right
 * categories. (3) Update apps/workers/ENV.md with that command's env requirements. (4) Ensure
 * index.ts only builds/creates the module contexts (ORM, MQ, Parser, etc.) that the command needs
 * (index uses the same categoriesForCommand mapping).
 *
 * Console output is intentional for startup diagnostics.
 */

import { KNOWN_COMMANDS } from '@workers/commands/commandNames.js';
import { hasAnyImageShrinkEnvSet, SUPPORTED_BUCKET_PROVIDERS } from '@workers/config/index.js';
import { validateSpamFeedItemThresholdEnvVar } from '@workers/lib/parser/spamThresholdEnv.js';

import { isBucketProvider } from '@podverse/external-services-object-storage';
import { DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS } from '@podverse/helpers';
import type { ValidationResult, ValidationSummary } from '@podverse/helpers-config';
import {
  displayValidationResults,
  validateOptional,
  validateOptionalAbsoluteHttpUrlIfSet,
  validatePositiveNumber,
  validateRequired,
} from '@podverse/helpers-config';
import { buildObservabilityValidationResults } from '@podverse/observability/config';

import { isLongRunningCommand } from '../extensions/longRunningCommands.js';
import {
  CATEGORY_BASE,
  CATEGORY_IMAGE_SHRINK,
  CATEGORY_KEYVALDB,
  CATEGORY_MQ,
  CATEGORY_ORM,
  CATEGORY_PARSER,
  CATEGORY_PODCAST_INDEX,
  CATEGORY_WEB_NOTIFICATIONS,
  getCategoriesForCommand,
} from './categoriesForCommand.js';

const USER_AGENT_PATTERN = /^[^/]+\/[^/]+\/[^/]+$/;

function validateUserAgentEffective(): ValidationResult {
  const raw = (process.env.USER_AGENT ?? '').trim();
  if (raw === '') {
    return {
      name: 'USER_AGENT',
      isSet: false,
      isValid: false,
      isRequired: true,
      message: 'Missing (required)',
      category: 'Config',
    };
  }
  if (!USER_AGENT_PATTERN.test(raw)) {
    return {
      name: 'USER_AGENT',
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid format: "${raw}" - must follow format: BrandName Bot Environment/AppName/Version`,
      category: 'Config',
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
      category: 'Config',
    };
  }
  return {
    name: 'USER_AGENT',
    isSet: true,
    isValid: true,
    isRequired: true,
    message: 'Valid format',
    category: 'Config',
  };
}

function validateStatsTrackEventRetentionDays(): ValidationResult {
  const key = 'STATS_TRACK_EVENT_RETENTION_DAYS';
  const value = process.env[key] ?? '';
  if (value.trim() === '') {
    return {
      name: key,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: `Use Default (${DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS} days)`,
      category: 'Stats',
    };
  }
  return validatePositiveNumber(key, 'Stats', false, 1, 3650);
}

/** Category: Config/Base — every command needs at least these */
function validateBase(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateUserAgentEffective());
  results.push(validateRequired('LOG_LEVEL', 'Config'));
  results.push(
    validateOptional('LOG_DIR', 'Config', 'Optional - empty for localhost, set for file logging')
  );
  results.push(validateOptional('LOG_TIMER', 'Config', 'Use Default (false)'));
  results.push(validateOptional('NODE_ENV', 'General', 'Use Default (development)'));
  results.push(validateStatsTrackEventRetentionDays());
  results.push(
    validateOptional('BILLING_RENEWAL_RETRY_DELAY_MINUTES', 'Billing', 'Use Default (60 minutes)')
  );
  results.push(
    validateOptional(
      'BILLING_RENEWAL_DRY_RUN_SUCCESS',
      'Billing',
      'Use Default (false - adapter_not_configured)'
    )
  );
  return results;
}

/** Category: ORM/Database */
function validateORM(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateRequired('DB_HOST', 'App database'));
  results.push(validateRequired('DB_PORT', 'App database'));
  results.push(validateRequired('DB_APP_NAME', 'App database'));
  results.push(validateRequired('DB_APP_READ_USER', 'App database'));
  results.push(validateRequired('DB_APP_READ_PASSWORD', 'App database'));
  results.push(validateRequired('DB_APP_READ_WRITE_USER', 'App database'));
  results.push(validateRequired('DB_APP_READ_WRITE_PASSWORD', 'App database'));
  results.push(validateOptional('DB_SSL_CONNECTION', 'App database', 'Use Default (false)'));
  results.push(validateRequired('DEFAULT_ACCOUNT_SETTINGS_LOCALE', 'Defaults'));
  results.push(validateRequired('ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY', 'Add-by-RSS'));
  return results;
}

/** Category: Message Queue */
function validateMQ(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateRequired('MESSAGE_QUEUE_PROTOCOL', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_HOST', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_USERNAME', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_PASSWORD', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_PORT', 'Message Queue'));
  return results;
}

/** Category: KeyValDB */
function validateKeyvaldb(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateRequired('KEYVALDB_HOST', 'KeyValDB'));
  results.push(validateRequired('KEYVALDB_PORT', 'KeyValDB'));
  results.push(validateRequired('KEYVALDB_PASSWORD', 'KeyValDB'));
  results.push(validateRequired('KEYVALDB_CACHE_EXPIRATION', 'KeyValDB'));
  return results;
}

function validateBucketForcePathStyle(): ValidationResult {
  const raw = (process.env.BUCKET_FORCE_PATH_STYLE ?? '').trim();
  if (raw === '') {
    return {
      name: 'BUCKET_FORCE_PATH_STYLE',
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Use Default (provider-specific)',
      category: 'Image Shrink',
    };
  }
  if (raw === 'true' || raw === 'false') {
    return {
      name: 'BUCKET_FORCE_PATH_STYLE',
      isSet: true,
      isValid: true,
      isRequired: false,
      message: `Set (${raw})`,
      category: 'Image Shrink',
    };
  }
  return {
    name: 'BUCKET_FORCE_PATH_STYLE',
    isSet: true,
    isValid: false,
    isRequired: false,
    message: `Invalid value: "${raw}" (expected true, false, or unset)`,
    category: 'Image Shrink',
  };
}

/** Category: Image Shrink */
function validateImageShrink(): ValidationResult[] {
  const results: ValidationResult[] = [];
  const bucketProvider = process.env.BUCKET_PROVIDER?.trim() ?? '';
  if (!hasAnyImageShrinkEnvSet()) {
    results.push(
      validateOptional('BUCKET_PROVIDER', 'Image Shrink', 'Disabled - BUCKET_PROVIDER not set')
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
    category: 'Image Shrink',
  });

  results.push(validateRequired('BUCKET_ACCESS_KEY', 'Image Shrink'));
  results.push(validateRequired('BUCKET_SECRET_KEY', 'Image Shrink'));
  results.push(validateRequired('BUCKET_REGION', 'Image Shrink'));
  results.push(validateRequired('BUCKET_NAME', 'Image Shrink'));
  results.push(validateRequired('BUCKET_CDN_BASE_URL', 'Image Shrink'));

  if (isBucketProviderValid) {
    if (bucketProvider === 'garage' || bucketProvider === 's3-compatible') {
      results.push(validateRequired('BUCKET_ENDPOINT', 'Image Shrink'));
    } else {
      results.push(
        validateOptional(
          'BUCKET_ENDPOINT',
          'Image Shrink',
          'Optional override for S3 API base URL (see docs/image-shrinking/BUCKET-PROVIDERS.md)'
        )
      );
    }
    results.push(
      validateOptionalAbsoluteHttpUrlIfSet('BUCKET_ENDPOINT', 'Image Shrink', 'Skipped')
    );
  }

  results.push(validateBucketForcePathStyle());

  {
    const varName = 'IMAGE_SHRINK_WIDTH_PX';
    const category = 'Image Shrink';
    const raw = process.env[varName];
    if (raw === undefined || raw.trim() === '') {
      results.push({
        name: varName,
        isSet: false,
        isValid: true,
        isRequired: false,
        message: 'Use Default (400)',
        category,
      });
    } else {
      const n = Number(raw);
      const ok = Number.isInteger(n) && n > 0;
      results.push({
        name: varName,
        isSet: true,
        isValid: ok,
        isRequired: false,
        message: ok ? 'Set' : 'Must be a positive integer',
        category,
      });
    }
  }
  {
    const varName = 'IMAGE_SHRINK_WEBP_QUALITY';
    const category = 'Image Shrink';
    const raw = process.env[varName];
    if (raw === undefined || raw.trim() === '') {
      results.push({
        name: varName,
        isSet: false,
        isValid: true,
        isRequired: false,
        message: 'Use Default (92)',
        category,
      });
    } else {
      const n = Number(raw);
      const ok = Number.isInteger(n) && n >= 1 && n <= 100;
      results.push({
        name: varName,
        isSet: true,
        isValid: ok,
        isRequired: false,
        message: ok ? 'Set' : 'Must be an integer from 1 to 100',
        category,
      });
    }
  }
  results.push(validateRequired('IMAGE_SHRINK_BATCH_SIZE', 'Image Shrink'));
  results.push(validateRequired('IMAGE_SHRINK_CONCURRENCY', 'Image Shrink'));
  results.push(validateRequired('IMAGE_SHRINK_RPS', 'Image Shrink'));
  {
    const varName = 'IMAGE_SHRINK_MAX_SOURCE_BYTES';
    const category = 'Image Shrink';
    const raw = process.env[varName];
    if (raw === undefined || raw.trim() === '') {
      results.push({
        name: varName,
        isSet: false,
        isValid: true,
        isRequired: false,
        message: 'Use Default (20971520)',
        category,
      });
    } else {
      const n = Number(raw);
      const ok = Number.isInteger(n) && n > 0;
      results.push({
        name: varName,
        isSet: true,
        isValid: ok,
        isRequired: false,
        message: ok ? 'Set' : 'Must be a positive integer',
        category,
      });
    }
  }
  results.push(
    validateOptional('IMAGE_SHRINK_RECHECK_EXPIRATION', 'Image Shrink', 'Use Default (86400)')
  );
  results.push(
    validateOptional('IMAGE_SHRINK_DEEP_RECHECK_EXPIRATION', 'Image Shrink', 'Use Default (604800)')
  );
  results.push(
    validateOptional(
      'IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION',
      'Image Shrink',
      'Use Default (2592000)'
    )
  );
  results.push(
    validateOptional('IMAGE_SHRINK_ORPHAN_CLEANUP_DRY_RUN', 'Image Shrink', 'Use Default (true)')
  );
  results.push(
    validateOptional('IMAGE_SHRINK_ORPHAN_CLEANUP_MAX_DELETE', 'Image Shrink', 'Use Default (none)')
  );
  results.push(
    validateOptional(
      'IMAGE_SHRINK_ORPHAN_MIN_AGE_EXPIRATION',
      'Image Shrink',
      'Use Default (604800)'
    )
  );
  results.push(
    validateOptional('IMAGE_SHRINK_ORPHAN_CLEANUP_PAGE_SIZE', 'Image Shrink', 'Use Default (500)')
  );
  return results;
}

/** Category: Parser */
function validateParser(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateOptional('PARSER_ADD_REMOTE_ITEMS_TO_MQ', 'Parser', 'Use Default (false)'));
  results.push(
    validateSpamFeedItemThresholdEnvVar(
      'PARSER_SPAM_FEED_ITEM_THRESHOLD_DEFAULT',
      'Parser',
      'Use Default (10000)'
    )
  );
  results.push(
    validateSpamFeedItemThresholdEnvVar(
      'PARSER_SPAM_FEED_ITEM_THRESHOLD_SPAM_PERMITTED',
      'Parser',
      'Use Default (100000)'
    )
  );
  results.push(
    validateOptional('PARSER_MAX_FEED_BODY_BYTES', 'Parser', 'Use Default (20971520 / 20 MiB)')
  );
  return results;
}

/** Category: Podcast Index */
function validatePodcastIndex(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateRequired('PODCAST_INDEX_AUTH_KEY', 'Podcast Index'));
  results.push(validateRequired('PODCAST_INDEX_BASE_URL', 'Podcast Index'));
  results.push(validateRequired('PODCAST_INDEX_SECRET_KEY', 'Podcast Index'));
  results.push(
    validateOptional('PODCAST_INDEX_API_RATE_LIMIT_DELAY', 'Podcast Index', 'Use Default (0)')
  );
  return results;
}

/** Category: Web / Notifications */
function validateWebNotifications(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(
    validateOptional('GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED', 'Firebase', 'Use Default (false)')
  );
  results.push(validateOptional('GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH', 'Firebase', 'Skipped'));
  results.push(validateRequired('WEB_PROTOCOL', 'Web'));
  results.push(validateRequired('WEB_DOMAIN', 'Web'));
  results.push(validateOptionalAbsoluteHttpUrlIfSet('WEB_ICON_IMAGE_PATH', 'Web'));
  results.push(validateRequired('BRAND_NAME', 'Notifications'));
  results.push(validateOptional('WEBPUSH_ENABLED', 'WebPush', 'Use Default (false)'));
  results.push(validateOptional('WEBPUSH_VAPID_PUBLIC_KEY', 'WebPush', 'Skipped'));
  results.push(validateOptional('WEBPUSH_VAPID_PRIVATE_KEY', 'WebPush', 'Skipped'));
  results.push(validateOptional('WEBPUSH_VAPID_SUBJECT', 'WebPush', 'Skipped'));
  return results;
}

/** Observability — first in apps/workers/.env.example Observability subsection. */
function validateObservability(): ValidationResult[] {
  return buildObservabilityValidationResults(process.env);
}

/** Extensions — last in apps/workers/.env.example; OpenTelemetry export, then Prometheus extension. */
function validateExtensions(commandName: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  const metricsExtensionEnabled = process.env.PROMETHEUS_ENABLED === 'true';

  if (!metricsExtensionEnabled) {
    results.push(
      validateOptional(
        'OTEL_EXPORTER_OTLP_ENDPOINT',
        'Extensions / OpenTelemetry',
        'Skipped (extensions disabled)'
      )
    );
    results.push(
      validateOptional(
        'OTEL_SERVICE_NAME',
        'Extensions / OpenTelemetry',
        'Skipped (extensions disabled)'
      )
    );
    results.push(
      validateOptional(
        'OTEL_RESOURCE_ATTRIBUTES',
        'Extensions / OpenTelemetry',
        'Skipped (extensions disabled)'
      )
    );
    results.push(
      validateOptional(
        'PROMETHEUS_ENABLED',
        'Extensions / Prometheus',
        'Blank/false: disabled; true: enable sidecar — set OTEL_* when true'
      )
    );
    return results;
  }

  if (isLongRunningCommand(commandName)) {
    results.push(validateRequired('OTEL_EXPORTER_OTLP_ENDPOINT', 'Extensions / OpenTelemetry'));
    results.push(validateRequired('OTEL_SERVICE_NAME', 'Extensions / OpenTelemetry'));
    results.push(
      validateOptional('OTEL_RESOURCE_ATTRIBUTES', 'Extensions / OpenTelemetry', 'Skipped')
    );
  } else {
    results.push(
      validateOptional(
        'OTEL_EXPORTER_OTLP_ENDPOINT',
        'Extensions / OpenTelemetry',
        'Skipped (not a long-running Deployment command)'
      )
    );
    results.push(
      validateOptional(
        'OTEL_SERVICE_NAME',
        'Extensions / OpenTelemetry',
        'Skipped (not a long-running Deployment command)'
      )
    );
    results.push(
      validateOptional(
        'OTEL_RESOURCE_ATTRIBUTES',
        'Extensions / OpenTelemetry',
        'Skipped (extensions disabled for command)'
      )
    );
  }

  results.push(
    validateOptional(
      'PROMETHEUS_ENABLED',
      'Extensions / Prometheus',
      'Blank/false: disabled; true: enable sidecar — set OTEL_* when true (long-running Deployments only)'
    )
  );

  return results;
}

/** Build ValidationSummary from results (same calculation as before) */
function buildValidationSummary(results: ValidationResult[]): ValidationSummary {
  const total = results.length;
  const passed = results.filter((r) => r.isValid && r.isSet).length;
  const failed = results.filter((r) => !r.isValid).length;
  const requiredMissing = results.filter((r) => r.isRequired && !r.isValid).length;
  const skipped = results.filter((r) => !r.isRequired && !r.isSet).length;
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
}

function getValidationResultsForCommand(commandName: string): ValidationResult[] {
  const categories = getCategoriesForCommand(commandName);
  const results: ValidationResult[] = [];

  if (categories.has(CATEGORY_BASE)) {
    results.push(...validateBase());
  }
  if (categories.has(CATEGORY_ORM)) {
    results.push(...validateORM());
  }
  if (categories.has(CATEGORY_MQ)) {
    results.push(...validateMQ());
  }
  if (categories.has(CATEGORY_PARSER)) {
    results.push(...validateParser());
  }
  if (categories.has(CATEGORY_PODCAST_INDEX)) {
    results.push(...validatePodcastIndex());
  }
  if (categories.has(CATEGORY_WEB_NOTIFICATIONS)) {
    results.push(...validateWebNotifications());
  }
  if (categories.has(CATEGORY_KEYVALDB)) {
    results.push(...validateKeyvaldb());
  }
  if (categories.has(CATEGORY_IMAGE_SHRINK)) {
    results.push(...validateImageShrink());
  }

  results.push(...validateObservability());
  results.push(...validateExtensions(commandName));

  return results;
}

/**
 * Validates environment variables required for the given command at startup.
 * Runs early in the initialization process to catch configuration errors
 * before the application attempts to start.
 *
 * @param commandName - The worker command name (e.g. statsUpdateAggregated, mqRSSRunParser)
 * @throws Error if command is unknown or any required variable for that command is missing
 */
export const validateStartupRequirements = (commandName: string): void => {
  if (!KNOWN_COMMANDS.includes(commandName)) {
    const errorMessage = `Unknown command for validation: ${commandName}`;
    console.error(`FATAL: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  console.log('Running startup validation...');

  const results = getValidationResultsForCommand(commandName);
  const summary = buildValidationSummary(results);
  displayValidationResults(summary);

  if (summary.failed > 0) {
    const errorMessage =
      summary.requiredMissing > 0
        ? `FATAL: ${summary.requiredMissing} required environment variable(s) are missing or invalid. Please check the validation output above for details.`
        : `FATAL: ${summary.failed} environment variable(s) failed validation. Please check the validation output above for details.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  console.log('Startup validation completed successfully');
};
