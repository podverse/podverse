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
 * **Adding a new command**: (1) Add the command to KNOWN_COMMANDS in commandNames.ts. (2) Add
 * the command to the appropriate group(s) in categoriesForCommand.ts so it gets the right
 * categories. (3) Update apps/workers/ENV.md with that command's env requirements. (4) Ensure
 * index.ts only builds/creates the module contexts (ORM, MQ, Parser, etc.) that the command needs
 * (index uses the same categoriesForCommand mapping).
 *
 * Console output is intentional for startup diagnostics.
 */

import type { ValidationResult, ValidationSummary } from '@podverse/helpers-config';
import {
  validateRequired,
  validateOptional,
  displayValidationResults,
} from '@podverse/helpers-config';
import { KNOWN_COMMANDS } from '@workers/commands/commandNames.js';
import {
  getCategoriesForCommand,
  CATEGORY_BASE,
  CATEGORY_ORM,
  CATEGORY_MQ,
  CATEGORY_PARSER,
  CATEGORY_PODCAST_INDEX,
  CATEGORY_WEB_NOTIFICATIONS,
  CATEGORY_KEYVALDB,
  CATEGORY_IMAGE_SHRINK,
} from './categoriesForCommand.js';
import { hasAnyImageShrinkEnvSet } from '@workers/config/index.js';

/** Category: Config/Base — every command needs at least these */
function validateBase(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateRequired('USER_AGENT', 'Config'));
  results.push(validateRequired('LOG_LEVEL', 'Config'));
  results.push(
    validateOptional('LOG_DIR', 'Config', 'Optional - empty for localhost, set for file logging')
  );
  results.push(validateOptional('LOG_TIMER', 'Config', 'Use Default (false)'));
  results.push(validateOptional('NODE_ENV', 'General', 'Use Default (development)'));
  return results;
}

/** Category: ORM/Database */
function validateORM(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateRequired('DB_HOST', 'Database'));
  results.push(validateRequired('DB_PORT', 'Database'));
  results.push(validateRequired('DB_READ_USERNAME', 'Database'));
  results.push(validateRequired('DB_READ_PASSWORD', 'Database'));
  results.push(validateRequired('DB_READ_WRITE_USERNAME', 'Database'));
  results.push(validateRequired('DB_READ_WRITE_PASSWORD', 'Database'));
  results.push(validateRequired('DB_DATABASE', 'Database'));
  results.push(validateOptional('DB_SSL_CONNECTION', 'Database', 'Use Default (false)'));
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
  results.push(validateRequired('KEYVALDB_CACHE_TTL_SECONDS', 'KeyValDB'));
  return results;
}

/** Category: Image Shrink */
function validateImageShrink(): ValidationResult[] {
  const results: ValidationResult[] = [];
  if (!hasAnyImageShrinkEnvSet()) {
    results.push(
      validateOptional(
        'IMAGE_SHRINK_WIDTH_PX',
        'Image Shrink',
        'Disabled - image shrink env vars not set'
      )
    );
    return results;
  }
  results.push(validateRequired('DIGITAL_OCEAN_ACCESS_KEY', 'DigitalOcean'));
  results.push(validateRequired('DIGITAL_OCEAN_SECRET_KEY', 'DigitalOcean'));
  results.push(validateRequired('IMAGE_CDN_REGION', 'Image Shrink'));
  results.push(validateRequired('IMAGE_CDN_BUCKET', 'Image Shrink'));
  results.push(validateRequired('IMAGE_CDN_BASE_URL', 'Image Shrink'));
  results.push(validateRequired('IMAGE_SHRINK_WIDTH_PX', 'Image Shrink'));
  results.push(validateRequired('IMAGE_SHRINK_BATCH_SIZE', 'Image Shrink'));
  results.push(validateRequired('IMAGE_SHRINK_CONCURRENCY', 'Image Shrink'));
  results.push(validateRequired('IMAGE_SHRINK_RPS', 'Image Shrink'));
  return results;
}

/** Category: Parser */
function validateParser(): ValidationResult[] {
  const results: ValidationResult[] = [];
  results.push(validateOptional('PARSER_ADD_REMOTE_ITEMS_TO_MQ', 'Parser', 'Use Default (false)'));
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
  results.push(validateOptional('WEB_ICON_IMAGE_PATH', 'Web', 'Skipped'));
  results.push(validateRequired('BRAND_NAME', 'Notifications'));
  results.push(validateOptional('WEBPUSH_ENABLED', 'WebPush', 'Use Default (false)'));
  results.push(validateOptional('WEBPUSH_VAPID_PUBLIC_KEY', 'WebPush', 'Skipped'));
  results.push(validateOptional('WEBPUSH_VAPID_PRIVATE_KEY', 'WebPush', 'Skipped'));
  results.push(validateOptional('WEBPUSH_VAPID_SUBJECT', 'WebPush', 'Skipped'));
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

  if (summary.requiredMissing > 0) {
    const errorMessage = `FATAL: ${summary.requiredMissing} required environment variable(s) are missing or invalid. Please check the validation output above for details.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  console.log('Startup validation completed successfully');
};
