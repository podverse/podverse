/* eslint-disable no-console */
/**
 * Startup validation for the workers app.
 *
 * **Command-first bootstrap**: The running command is determined from argv (see index.ts) before
 * any validation or config loading. Only that command's env vars are validated.
 *
 * **Per-job validators**: Each command has a set of config categories (Base, ORM, MQ, Parser,
 * PodcastIndex, WebNotifications, AddByRSS, and the rest in categoriesForCommand.ts). This module
 * validates only the env vars for those categories; required vs optional per category is defined
 * in the validate* functions below.
 *
 * **One source for checks and key lists**: Every validator reads from the env it is given, so the
 * same functions validate this process at startup and list the keys a command requires for any
 * env (`getRequiredEnvKeysForCommand`, which the k8s env contract test uses).
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
import {
  isNotificationsTestPushHelpArgv,
  notificationsTestPushEnabledResult,
} from '@workers/commands/orm/notifications/notificationsTestPushLib.js';
import { SUPPORTED_BUCKET_PROVIDERS } from '@workers/config/index.js';
import { validateSpamFeedItemThresholdEnvVar } from '@workers/lib/parser/spamThresholdEnv.js';

import { isBucketProvider } from '@podverse/external-services-object-storage';
import {
  PODCAST_INDEX_DEFAULT_MAX_RETRIES,
  PODCAST_INDEX_DEFAULT_RETRY_BASE_DELAY_MS,
} from '@podverse/external-services-podcast-index';
import {
  DEFAULT_ACCOUNT_CONTENT_LOG_RETENTION_DAYS,
  DEFAULT_ACCOUNT_SESSION_RETENTION_DAYS,
  DEFAULT_NOTIFICATION_RETENTION_DAYS,
  DEFAULT_ON_DEMAND_PARSER_EVENT_RETENTION_DAYS,
  DEFAULT_SCHEDULED_JOB_RETENTION_DAYS,
  DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS,
  STATS_POPULARITY_RANGE_LOOKBACK_DAYS,
  validateAbsoluteHttpUrlValue,
  validateBooleanValue,
  validateOptionalValue,
  validatePositiveNumberValue,
  validateRequiredValue,
} from '@podverse/helpers';
import type { ValidationResult, ValidationSummary } from '@podverse/helpers-config';
import {
  displayValidationResults,
  validateAppleProcessorEnv,
  validateBillingSandboxAllowlistEnv,
  validateGooglePlayProcessorEnv,
  validatePayPalProcessorEnv,
  validateStrikeProcessorEnv,
} from '@podverse/helpers-config';
import { buildObservabilityValidationResults } from '@podverse/observability/config';

import { isLongRunningCommand } from '../extensions/longRunningCommands.js';
import {
  CATEGORY_ADD_BY_RSS,
  CATEGORY_BASE,
  CATEGORY_BILLING,
  CATEGORY_IMAGE_SHRINK,
  CATEGORY_KEYVALDB,
  CATEGORY_MQ,
  CATEGORY_ORM,
  CATEGORY_PARSER,
  CATEGORY_PODCAST_INDEX,
  CATEGORY_WEB_NOTIFICATIONS,
  getCategoriesForCommand,
} from './categoriesForCommand.js';

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

const USER_AGENT_PATTERN = /^[^/]+\/[^/]+\/[^/]+$/;

function validateUserAgentEffective(env: StartupEnv): ValidationResult {
  const raw = (env.USER_AGENT ?? '').trim();
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

/**
 * A day is the smallest window worth expressing and ten years is past the point where a retention
 * setting is doing anything, so a value outside that is a unit mistake — seconds or milliseconds
 * pasted into a field counted in days — rather than a deliberate choice.
 */
const RETENTION_DAYS_MIN = 1;
const RETENTION_DAYS_MAX = 3650;

/**
 * Every retention window is optional and falls back to a shared default, so the check is the same
 * shape each time: blank reports which default will apply, and anything else must be a plausible
 * number of days. The category is what differs, because an operator scanning startup output looks
 * for the subsystem rather than the variable.
 */
function validateRetentionDays(
  env: StartupEnv,
  key: string,
  category: string,
  fallback: number,
  min = RETENTION_DAYS_MIN
): ValidationResult {
  const value = env[key] ?? '';
  if (value.trim() === '') {
    return {
      name: key,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: `Use Default (${fallback} days)`,
      category,
    };
  }
  return validatePositiveNumberValue(value, key, category, false, min, RETENTION_DAYS_MAX);
}

/** Popularity month counts read events, so retention must keep every day of the month window. */
const STATS_TRACK_EVENT_RETENTION_DAYS_MIN = STATS_POPULARITY_RANGE_LOOKBACK_DAYS.month + 1;

/** Category: Config/Base — every command needs at least these */
function validateBase(env: StartupEnv): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateUserAgentEffective(env));
  results.push(validateRequired(env, 'LOG_LEVEL', 'Config'));
  results.push(
    validateOptional(
      env,
      'LOG_DIR',
      'Config',
      'Optional - empty for localhost, set for file logging'
    )
  );
  results.push(validateOptional(env, 'LOG_TIMER', 'Config', 'Use Default (false)'));
  results.push(validateOptional(env, 'NODE_ENV', 'General', 'Use Default (development)'));
  results.push(
    validateRetentionDays(
      env,
      'STATS_TRACK_EVENT_RETENTION_DAYS',
      'Stats',
      DEFAULT_STATS_TRACK_EVENT_RETENTION_DAYS,
      STATS_TRACK_EVENT_RETENTION_DAYS_MIN
    )
  );
  results.push(
    validateRetentionDays(
      env,
      'NOTIFICATION_RETENTION_DAYS',
      'Notifications',
      DEFAULT_NOTIFICATION_RETENTION_DAYS
    )
  );
  results.push(
    validateRetentionDays(
      env,
      'ACCOUNT_CONTENT_LOG_RETENTION_DAYS',
      'Removed Content',
      DEFAULT_ACCOUNT_CONTENT_LOG_RETENTION_DAYS
    )
  );
  results.push(
    validateRetentionDays(
      env,
      'ACCOUNT_SESSION_RETENTION_DAYS',
      'Account sessions',
      DEFAULT_ACCOUNT_SESSION_RETENTION_DAYS
    )
  );
  results.push(
    validateRetentionDays(
      env,
      'SCHEDULED_JOB_RETENTION_DAYS',
      'Scheduled Jobs',
      DEFAULT_SCHEDULED_JOB_RETENTION_DAYS
    )
  );
  results.push(
    validateRetentionDays(
      env,
      'ON_DEMAND_PARSER_EVENT_RETENTION_DAYS',
      'Parser',
      DEFAULT_ON_DEMAND_PARSER_EVENT_RETENTION_DAYS
    )
  );
  results.push(validateOptional(env, 'BILLING_WEBHOOK_PUBLIC_BASE_URL', 'Billing', 'Skipped'));
  results.push(validateBillingSandboxAllowlistEnv(env));
  results.push(validateBoolean(env, 'BILLING_SANDBOX_GRANT_ALL', 'Billing'));
  return results;
}

/**
 * Category: Billing — commands that talk to payment processors. Each processor runs only when its
 * *_ENABLED flag is "true", and then every key it needs is required.
 */
function validateBillingProcessors(env: StartupEnv): ValidationResult[] {
  return [
    validateBoolean(env, 'BILLING_ALLOW_TEST_ADAPTER', 'Billing'),
    ...validatePayPalProcessorEnv(env),
    ...validateAppleProcessorEnv(env),
    ...validateGooglePlayProcessorEnv(env),
    ...validateStrikeProcessorEnv(env),
  ];
}

/** Category: ORM/Database */
function validateORM(env: StartupEnv): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateRequired(env, 'DB_HOST', 'App database'));
  results.push(validateRequired(env, 'DB_PORT', 'App database'));
  results.push(validateRequired(env, 'DB_APP_NAME', 'App database'));
  results.push(validateRequired(env, 'DB_APP_READ_USER', 'App database'));
  results.push(validateRequired(env, 'DB_APP_READ_PASSWORD', 'App database'));
  results.push(validateRequired(env, 'DB_APP_READ_WRITE_USER', 'App database'));
  results.push(validateRequired(env, 'DB_APP_READ_WRITE_PASSWORD', 'App database'));
  results.push(validateOptional(env, 'DB_SSL_CONNECTION', 'App database', 'Use Default (false)'));
  results.push(validateRequired(env, 'DEFAULT_ACCOUNT_SETTINGS_LOCALE', 'Defaults'));
  return results;
}

/**
 * Category: Add by RSS. Required only for commands that open or seal credential envelopes.
 * The previous key is set during rotation and is otherwise unread.
 */
function validateAddByRSS(env: StartupEnv): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateRequired(env, 'ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY', 'Add-by-RSS'));
  results.push(
    validateOptional(
      env,
      'ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY_OLD',
      'Add-by-RSS',
      'Skipped (key rotation)'
    )
  );
  return results;
}

/** Category: Message Queue */
function validateMQ(env: StartupEnv): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateRequired(env, 'MESSAGE_QUEUE_PROTOCOL', 'Message Queue'));
  results.push(validateRequired(env, 'MESSAGE_QUEUE_HOST', 'Message Queue'));
  results.push(validateRequired(env, 'MESSAGE_QUEUE_USERNAME', 'Message Queue'));
  results.push(validateRequired(env, 'MESSAGE_QUEUE_PASSWORD', 'Message Queue'));
  results.push(validateRequired(env, 'MESSAGE_QUEUE_PORT', 'Message Queue'));
  return results;
}

/** Category: KeyValDB */
function validateKeyvaldb(env: StartupEnv): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateRequired(env, 'KEYVALDB_HOST', 'KeyValDB'));
  results.push(validateRequired(env, 'KEYVALDB_PORT', 'KeyValDB'));
  results.push(validateRequired(env, 'KEYVALDB_PASSWORD', 'KeyValDB'));
  results.push(validateRequired(env, 'KEYVALDB_CACHE_EXPIRATION', 'KeyValDB'));
  results.push(
    validateOptional(env, 'OPML_IMPORT_MAX_FEEDS_PER_HOUR', 'OPML Import', 'Use Default (50)')
  );
  return results;
}

function validateBucketForcePathStyle(env: StartupEnv): ValidationResult {
  const raw = (env.BUCKET_FORCE_PATH_STYLE ?? '').trim();
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

/** Category: Image Shrink. A blank `BUCKET_PROVIDER` turns image shrinking off. */
function validateImageShrink(env: StartupEnv): ValidationResult[] {
  const results: ValidationResult[] = [];
  const bucketProvider = env.BUCKET_PROVIDER?.trim() ?? '';
  if (bucketProvider === '') {
    results.push(
      validateOptional(env, 'BUCKET_PROVIDER', 'Image Shrink', 'Disabled - BUCKET_PROVIDER not set')
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

  results.push(validateRequired(env, 'BUCKET_ACCESS_KEY', 'Image Shrink'));
  results.push(validateRequired(env, 'BUCKET_SECRET_KEY', 'Image Shrink'));
  results.push(validateRequired(env, 'BUCKET_REGION', 'Image Shrink'));
  results.push(validateRequired(env, 'BUCKET_NAME', 'Image Shrink'));
  results.push(validateRequired(env, 'BUCKET_CDN_BASE_URL', 'Image Shrink'));

  if (isBucketProviderValid) {
    if (bucketProvider === 'garage' || bucketProvider === 's3-compatible') {
      results.push(validateRequired(env, 'BUCKET_ENDPOINT', 'Image Shrink'));
    } else {
      results.push(
        validateOptional(
          env,
          'BUCKET_ENDPOINT',
          'Image Shrink',
          'Optional override for S3 API base URL (see docs/image-shrinking/BUCKET-PROVIDERS.md)'
        )
      );
    }
    results.push(
      validateOptionalAbsoluteHttpUrlIfSet(env, 'BUCKET_ENDPOINT', 'Image Shrink', 'Skipped')
    );
  }

  results.push(validateBucketForcePathStyle(env));

  {
    const varName = 'IMAGE_SHRINK_WIDTH_PX';
    const category = 'Image Shrink';
    const raw = env[varName];
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
    const raw = env[varName];
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
  results.push(validateRequired(env, 'IMAGE_SHRINK_BATCH_SIZE', 'Image Shrink'));
  results.push(validateRequired(env, 'IMAGE_SHRINK_CONCURRENCY', 'Image Shrink'));
  results.push(validateRequired(env, 'IMAGE_SHRINK_RPS', 'Image Shrink'));
  {
    const varName = 'IMAGE_SHRINK_MAX_SOURCE_BYTES';
    const category = 'Image Shrink';
    const raw = env[varName];
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
    validateOptional(env, 'IMAGE_SHRINK_RECHECK_EXPIRATION', 'Image Shrink', 'Use Default (86400)')
  );
  results.push(
    validateOptional(
      env,
      'IMAGE_SHRINK_DEEP_RECHECK_EXPIRATION',
      'Image Shrink',
      'Use Default (604800)'
    )
  );
  results.push(
    validateOptional(
      env,
      'IMAGE_SHRINK_SOURCE_PRUNE_EXPIRATION',
      'Image Shrink',
      'Use Default (2592000)'
    )
  );
  results.push(
    validateOptional(
      env,
      'IMAGE_SHRINK_ORPHAN_CLEANUP_DRY_RUN',
      'Image Shrink',
      'Use Default (true)'
    )
  );
  results.push(
    validateOptional(
      env,
      'IMAGE_SHRINK_ORPHAN_CLEANUP_MAX_DELETE',
      'Image Shrink',
      'Use Default (none)'
    )
  );
  results.push(
    validateOptional(
      env,
      'IMAGE_SHRINK_ORPHAN_MIN_AGE_EXPIRATION',
      'Image Shrink',
      'Use Default (604800)'
    )
  );
  results.push(
    validateOptional(
      env,
      'IMAGE_SHRINK_ORPHAN_CLEANUP_PAGE_SIZE',
      'Image Shrink',
      'Use Default (500)'
    )
  );
  return results;
}

/**
 * Category: Parser. Every key here is optional. The spam thresholds share their parser with
 * runtime config and read `process.env`.
 */
function validateParser(env: StartupEnv): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(
    validateOptional(env, 'PARSER_ADD_REMOTE_ITEMS_TO_MQ', 'Parser', 'Use Default (false)')
  );
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
    validateOptional(env, 'PARSER_MAX_FEED_BODY_BYTES', 'Parser', 'Use Default (20971520 / 20 MiB)')
  );
  return results;
}

function validatePodcastIndexMode(env: StartupEnv, name: string): ValidationResult {
  const category = 'Podcast Index';
  const value = env[name];
  if (value === undefined || value.trim() === '') {
    return {
      name,
      isSet: false,
      isValid: false,
      isRequired: true,
      message: 'Missing or empty',
      category,
    };
  }
  if (value === 'off' || value === 'dry_run' || value === 'apply') {
    return {
      name,
      isSet: true,
      isValid: true,
      isRequired: true,
      message: 'Set',
      category,
    };
  }
  return {
    name,
    isSet: true,
    isValid: false,
    isRequired: true,
    message: 'Must be off, dry_run, or apply',
    category,
  };
}

/** Category: Podcast Index */
function validatePodcastIndex(env: StartupEnv): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateRequired(env, 'PODCAST_INDEX_BASE_URL', 'Podcast Index'));
  results.push(validatePodcastIndexMode(env, 'PODCAST_INDEX_DUPLICATE_MERGE_MODE'));
  results.push(validatePodcastIndexMode(env, 'PODCAST_INDEX_DEAD_FEED_RETIRE_MODE'));
  results.push(validateRequired(env, 'PODCAST_INDEX_AUTH_KEY', 'Podcast Index'));
  results.push(validateRequired(env, 'PODCAST_INDEX_SECRET_KEY', 'Podcast Index'));
  results.push(
    validateOptional(
      env,
      'PODCAST_INDEX_API_RATE_LIMIT_DELAY',
      'Podcast Index',
      'Use Default (200)'
    )
  );
  results.push(
    validateOptional(
      env,
      'PODCAST_INDEX_API_MAX_RETRIES',
      'Podcast Index',
      `Use Default (${PODCAST_INDEX_DEFAULT_MAX_RETRIES})`
    )
  );
  results.push(
    validateOptional(
      env,
      'PODCAST_INDEX_API_RETRY_BASE_DELAY_MS',
      'Podcast Index',
      `Use Default (${PODCAST_INDEX_DEFAULT_RETRY_BASE_DELAY_MS})`
    )
  );
  return results;
}

/** Category: Web / Notifications */
function validateWebNotifications(env: StartupEnv): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(
    validateOptional(
      env,
      'GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED',
      'Firebase',
      'Use Default (false)'
    )
  );
  results.push(validateOptional(env, 'GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH', 'Firebase', 'Skipped'));
  results.push(validateRequired(env, 'WEB_PROTOCOL', 'Web'));
  results.push(validateRequired(env, 'WEB_DOMAIN', 'Web'));
  results.push(validateOptionalAbsoluteHttpUrlIfSet(env, 'WEB_ICON_IMAGE_PATH', 'Web'));
  results.push(validateRequired(env, 'BRAND_NAME', 'Notifications'));
  results.push(validateOptional(env, 'WEBPUSH_ENABLED', 'WebPush', 'Use Default (false)'));
  results.push(validateOptional(env, 'WEBPUSH_VAPID_PUBLIC_KEY', 'WebPush', 'Skipped'));
  results.push(validateOptional(env, 'WEBPUSH_VAPID_PRIVATE_KEY', 'WebPush', 'Skipped'));
  results.push(validateOptional(env, 'WEBPUSH_VAPID_SUBJECT', 'WebPush', 'Skipped'));
  return results;
}

/** Observability — first in apps/workers/.env.example Observability subsection. */
function validateObservability(env: StartupEnv): ValidationResult[] {
  return buildObservabilityValidationResults(env);
}

/** Extensions — last in apps/workers/.env.example; OpenTelemetry export, then Prometheus extension. */
function validateExtensions(env: StartupEnv, commandName: string): ValidationResult[] {
  const results: ValidationResult[] = [];
  const metricsExtensionEnabled = env.PROMETHEUS_ENABLED === 'true';

  if (!metricsExtensionEnabled) {
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
    results.push(
      validateOptional(
        env,
        'PROMETHEUS_ENABLED',
        'Extensions / Prometheus',
        'Blank/false: disabled; true: enable sidecar — set OTEL_* when true'
      )
    );
    return results;
  }

  if (isLongRunningCommand(commandName)) {
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
        'Skipped (not a long-running Deployment command)'
      )
    );
    results.push(
      validateOptional(
        env,
        'OTEL_SERVICE_NAME',
        'Extensions / OpenTelemetry',
        'Skipped (not a long-running Deployment command)'
      )
    );
    results.push(
      validateOptional(
        env,
        'OTEL_RESOURCE_ATTRIBUTES',
        'Extensions / OpenTelemetry',
        'Skipped (extensions disabled for command)'
      )
    );
  }

  results.push(
    validateOptional(
      env,
      'PROMETHEUS_ENABLED',
      'Extensions / Prometheus',
      'Blank/false: disabled; true: enable sidecar — set OTEL_* when true (long-running Deployments only)'
    )
  );

  return results;
}

/** Build ValidationSummary from results */
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

function getValidationResultsForCommand(
  commandName: string,
  env: StartupEnv,
  argv: readonly string[]
): ValidationResult[] {
  const categories = getCategoriesForCommand(commandName);
  const results: ValidationResult[] = [];

  if (categories.has(CATEGORY_BASE)) {
    results.push(...validateBase(env));
  }
  if (categories.has(CATEGORY_ORM)) {
    results.push(...validateORM(env));
  }
  if (categories.has(CATEGORY_ADD_BY_RSS)) {
    results.push(...validateAddByRSS(env));
  }
  if (categories.has(CATEGORY_MQ)) {
    results.push(...validateMQ(env));
  }
  if (commandName === 'mqRSSRunParser') {
    results.push(
      validateOptional('MQ_CONSUMER_IN_FLIGHT_FILE', 'Message Queue', 'Skipped - no in-flight file')
    );
  }
  if (categories.has(CATEGORY_PARSER)) {
    results.push(...validateParser(env));
  }
  if (categories.has(CATEGORY_PODCAST_INDEX)) {
    results.push(...validatePodcastIndex(env));
  }
  if (categories.has(CATEGORY_WEB_NOTIFICATIONS)) {
    results.push(...validateWebNotifications(env));
  }
  if (categories.has(CATEGORY_KEYVALDB)) {
    results.push(...validateKeyvaldb(env));
  }
  if (categories.has(CATEGORY_IMAGE_SHRINK)) {
    results.push(...validateImageShrink(env));
  }
  if (categories.has(CATEGORY_BILLING)) {
    results.push(...validateBillingProcessors(env));
  }
  if (commandName === 'notificationsTestPush' && !isNotificationsTestPushHelpArgv(argv)) {
    results.push(notificationsTestPushEnabledResult(env.NOTIFICATIONS_TEST_PUSH_ENABLED));
  }

  results.push(...validateObservability(env));
  results.push(...validateExtensions(env, commandName));

  return results;
}

/**
 * Env var names `commandName` requires at startup, read from the same validators that run at
 * startup. Values in `env` decide conditional keys: a set `BUCKET_PROVIDER` requires the bucket
 * keys, an enabled billing processor requires its keys, and `PROMETHEUS_ENABLED=true` requires the
 * OTLP keys for long-running commands. `argv` holds the command's flags (`--help` skips the
 * notificationsTestPush gate).
 */
export function getRequiredEnvKeysForCommand(
  commandName: string,
  env: NodeJS.ProcessEnv,
  argv: readonly string[] = []
): string[] {
  const required = getValidationResultsForCommand(commandName, env, argv)
    .filter((result) => result.isRequired)
    .map((result) => result.name);
  return [...new Set(required)];
}

/**
 * Validates environment variables required for the given command at startup.
 * Runs early in the initialization process to catch configuration errors
 * before the application attempts to start.
 *
 * @param commandName - The worker command name (e.g. statsPopularityRefresh, mqRSSRunParser)
 * @throws Error if command is unknown or any required variable for that command is missing
 */
export const validateStartupRequirements = (commandName: string): void => {
  if (!KNOWN_COMMANDS.includes(commandName)) {
    const errorMessage = `Unknown command for validation: ${commandName}`;
    console.error(`FATAL: ${errorMessage}`);
    throw new Error(errorMessage);
  }

  console.log('Running startup validation...');

  const results = getValidationResultsForCommand(commandName, process.env, process.argv);
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
