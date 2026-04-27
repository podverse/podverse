/* eslint-disable no-console */
/**
 * Startup validation module - console output is intentional for startup diagnostics.
 * This module validates environment variables before the application starts.
 */

import { isValidUUID } from '@podverse/helpers';
import type { ValidationResult, ValidationSummary } from '@podverse/helpers-config';
import { validateOptional, validateRequired } from '@podverse/helpers-config';

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
    // Throw error - stack trace will be suppressed in index.ts for validation errors
    throw new Error(errorMessage);
  }

  console.log('Startup validation completed successfully');
};

/**
 * Validates all environment variables and returns a comprehensive summary
 */
const validateAllEnvironmentVariables = (): ValidationSummary => {
  const results: ValidationResult[] = [];

  // Auth & Security
  results.push(validateJwtSecret());
  results.push(
    validateOptional('AUTH_JWT_EXPIRES_IN', 'Auth & Security', 'Blank uses default (365d)')
  );
  results.push(
    validateOptional(
      'AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY',
      'Auth & Security',
      'Blank/false: omit token from login JSON; true: allow token when client sends includeTokenInResponseBody'
    )
  );
  results.push(validateRequired('BRAND_NAME', 'Auth & Security'));
  results.push(validateUserAgent());

  // One Postgres instance: shared host/port; DB_APP_* and DB_MANAGEMENT_* name each database and its roles.
  results.push(validateRequired('DB_HOST', 'Postgres'));
  results.push(validateRequired('DB_PORT', 'Postgres'));
  results.push(validateOptional('DB_SSL_CONNECTION', 'Postgres', 'Use Default (false)'));

  // Main app database
  results.push(validateRequired('DB_APP_NAME', 'App Database'));
  results.push(validateRequired('DB_APP_READ_USER', 'App Database'));
  results.push(validateRequired('DB_APP_READ_PASSWORD', 'App Database'));
  results.push(validateRequired('DB_APP_READ_WRITE_USER', 'App Database'));
  results.push(validateRequired('DB_APP_READ_WRITE_PASSWORD', 'App Database'));

  // Management (admin) database
  results.push(validateRequired('DB_MANAGEMENT_NAME', 'Management Database'));
  results.push(validateRequired('DB_MANAGEMENT_READ_USER', 'Management Database'));
  results.push(validateRequired('DB_MANAGEMENT_READ_PASSWORD', 'Management Database'));
  results.push(validateRequired('DB_MANAGEMENT_READ_WRITE_USER', 'Management Database'));
  results.push(validateRequired('DB_MANAGEMENT_READ_WRITE_PASSWORD', 'Management Database'));

  // API Configuration
  results.push(validateRequired('API_PORT', 'API'));
  results.push(validateRequired('API_PREFIX', 'API'));
  results.push(validateRequired('API_VERSION', 'API'));
  results.push(validateRequired('COOKIE_DOMAIN', 'API'));
  results.push(validateRequired('API_ALLOWED_CORS_ORIGINS', 'API'));

  // Web
  results.push(validateRequired('WEB_PROTOCOL', 'Web'));
  results.push(validateRequired('WEB_DOMAIN', 'Web'));

  // User Management
  results.push(
    validateOptional(
      'MANAGEMENT_API_SET_PASSWORD_TTL_HOURS',
      'User Management',
      'Hours before set-password invite links expire. Default: 168 (7 days)'
    )
  );

  // General
  results.push(validateRequired('NODE_ENV', 'General'));
  results.push(validateRequired('LOG_LEVEL', 'General'));

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
const validateJwtSecret = (): ValidationResult => {
  const jwtSecret = process.env.AUTH_JWT_SECRET || '';

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

const USER_AGENT_PATTERN = /^[^/]+\/[^/]+\/[^/]+$/;

/**
 * Validates `USER_AGENT` (required, non-blank; no inference from `BRAND_NAME`).
 * Format: `BrandName Bot Environment/AppName/Version`, e.g. `Example Bot local/Management-API/5`
 */
const validateUserAgent = (): ValidationResult => {
  const raw = (process.env.USER_AGENT ?? '').trim();
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
  if (firstPart && !firstPart.includes('Bot')) {
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
