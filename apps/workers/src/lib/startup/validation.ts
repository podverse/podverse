/* eslint-disable no-console */
/**
 * Startup validation module - console output is intentional for startup diagnostics.
 * This module validates environment variables before the application starts.
 */

import { ValidationResult, ValidationSummary, validateRequired, validateOptional } from '@podverse/helpers';

/**
 * Validates critical environment variables and configuration at application startup.
 * This function runs early in the initialization process to catch configuration errors
 * before the application attempts to start serving requests.
 * 
 * @throws Error if any critical validation fails
 */
export const validateStartupRequirements = (): void => {
  console.log('Running startup validation...');

  const summary = validateAllEnvironmentVariables();
  displayValidationResults(summary);
  
  if (summary.requiredMissing > 0) {
    const errorMessage = `FATAL: ${summary.requiredMissing} required environment variable(s) are missing or invalid. Please check the validation output above for details.`;
    console.error(errorMessage);
    throw new Error(errorMessage);
  }

  console.log('Startup validation completed successfully');
};

/**
 * Validates all environment variables and returns a comprehensive summary
 */
const validateAllEnvironmentVariables = (): ValidationSummary => {
  const results: ValidationResult[] = [];
  
  // Config values
  results.push(validateRequired('USER_AGENT', 'Config'));
  results.push(validateRequired('LOG_LEVEL', 'Config'));
  results.push(validateOptional('LOG_DIR', 'Config', 'Optional - empty for localhost, set for file logging'));
  results.push(validateOptional('LOG_TIMER', 'Config', 'Use Default (false)'));
  
  // Podcast Index
  results.push(validateRequired('PODCAST_INDEX_AUTH_KEY', 'Podcast Index'));
  results.push(validateRequired('PODCAST_INDEX_BASE_URL', 'Podcast Index'));
  results.push(validateRequired('PODCAST_INDEX_SECRET_KEY', 'Podcast Index'));
  results.push(validateOptional('PODCAST_INDEX_API_RATE_LIMIT_DELAY', 'Podcast Index', 'Use Default (0)'));
  
  // Message Queue
  results.push(validateRequired('MESSAGE_QUEUE_PROTOCOL', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_HOST', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_USERNAME', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_PASSWORD', 'Message Queue'));
  results.push(validateRequired('MESSAGE_QUEUE_PORT', 'Message Queue'));

  // Database
  results.push(validateRequired('DB_HOST', 'Database'));
  results.push(validateRequired('DB_PORT', 'Database'));
  results.push(validateRequired('DB_READ_USERNAME', 'Database'));
  results.push(validateRequired('DB_READ_PASSWORD', 'Database'));
  results.push(validateRequired('DB_READ_WRITE_USERNAME', 'Database'));
  results.push(validateRequired('DB_READ_WRITE_PASSWORD', 'Database'));
  results.push(validateRequired('DB_DATABASE', 'Database'));
  results.push(validateOptional('DB_SSL_CONNECTION', 'Database', 'Use Default (false)'));

  // Defaults
  results.push(validateRequired('DEFAULT_ACCOUNT_SETTINGS_LOCALE', 'Defaults'));

  // Firebase
  results.push(validateOptional('GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED', 'Firebase', 'Use Default (false)'));
  results.push(validateOptional('GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH', 'Firebase', 'Skipped'));

  // Web
  results.push(validateRequired('WEB_PROTOCOL', 'Web'));
  results.push(validateRequired('WEB_DOMAIN', 'Web'));
  results.push(validateOptional('WEB_ICON_IMAGE_PATH', 'Web', 'Skipped'));

  // Notifications
  results.push(validateRequired('BRAND_NAME', 'Notifications'));
  results.push(validateOptional('WEBPUSH_ENABLED', 'WebPush', 'Use Default (false)'));
  results.push(validateOptional('WEBPUSH_VAPID_PUBLIC_KEY', 'WebPush', 'Skipped'));
  results.push(validateOptional('WEBPUSH_VAPID_PRIVATE_KEY', 'WebPush', 'Skipped'));
  results.push(validateOptional('WEBPUSH_VAPID_SUBJECT', 'WebPush', 'Skipped'));

  // Parser
  results.push(validateOptional('PARSER_ADD_REMOTE_ITEMS_TO_MQ', 'Parser', 'Use Default (false)'));

  // General
  results.push(validateOptional('NODE_ENV', 'General', 'Use Default (development)'));

  // Calculate summary
  const total = results.length;
  const passed = results.filter(r => r.isValid && r.isSet).length;
  const failed = results.filter(r => !r.isValid).length;
  const requiredMissing = results.filter(r => r.isRequired && !r.isValid).length;
  const skipped = results.filter(r => !r.isRequired && !r.isSet).length;
  const defaultsUsed = results.filter(r => r.isValid && r.isSet && (r.message.includes('Use Default') || r.message === 'Blank')).length;

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
  const passedText = summary.defaultsUsed > 0 
    ? `Passed: ${summary.passed} (${summary.defaultsUsed} using defaults)`
    : `Passed: ${summary.passed}`;
  console.log(passedText);
  console.log(`Skipped: ${summary.skipped}`);
  console.log(`Failed: ${summary.failed}`);
  console.log(`Required Missing: ${summary.requiredMissing}`);
  
  if (summary.failed > 0) {
    console.error('The following environment variables failed validation:');
    summary.results
      .filter(r => !r.isValid)
      .forEach(r => {
        const requiredText = r.isRequired ? ' (required)' : ' (optional)';
        console.error(`  - ${r.name}${requiredText}: ${r.message}`);
      });
  }

  if (summary.skipped > 0) {
    console.log('Skipped optional variables (not set):');
    summary.results
      .filter(r => !r.isRequired && !r.isSet)
      .forEach(r => console.log(`  - ${r.name}`));
  }
};
