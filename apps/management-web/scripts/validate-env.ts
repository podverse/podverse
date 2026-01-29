/**
 * Validates that all required environment variables are set before build.
 * Aborts the build process if any required variables are missing or invalid.
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { existsSync } from 'fs';
import {
  ValidationResult,
  ValidationSummary,
  validateRequired,
  validateOptional,
  validateSupportedLocalesList,
  validateLocale,
} from '@podverse/helpers-config';

// Load .env file based on NODE_ENV
// Next.js loads .env files automatically, but this script runs standalone via ts-node
// In production builds (Docker), env files are copied to .env.production
// In development, use .env.local (if exists) or .env
const nodeEnv = process.env.NODE_ENV || 'development';
const cwd = process.cwd();

let loadedEnvFile: string | null = null;

if (nodeEnv === 'production') {
  // Production: Try .env.production first (as set in Dockerfile), then .env
  const prodPath = resolve(cwd, '.env.production');
  const envPath = resolve(cwd, '.env');

  if (existsSync(prodPath)) {
    config({ path: prodPath });
    loadedEnvFile = prodPath;
  } else if (existsSync(envPath)) {
    config({ path: envPath });
    loadedEnvFile = envPath;
  }
} else {
  // Development: Try .env.local first (Next.js priority), then .env
  const localPath = resolve(cwd, '.env.local');
  const envPath = resolve(cwd, '.env');

  if (existsSync(localPath)) {
    config({ path: localPath });
    loadedEnvFile = localPath;
  } else if (existsSync(envPath)) {
    config({ path: envPath });
    loadedEnvFile = envPath;
  }
}

// Log which env file was loaded (helpful for CI debugging)
if (loadedEnvFile) {
  console.log(`📁 Loaded env file: ${loadedEnvFile}`);
} else {
  console.log(`⚠️  No .env file found (NODE_ENV=${nodeEnv})`);
}

/**
 * Validates NEXT_PUBLIC_API_PORT (must be a positive number if set, optional)
 */
const validateApiPort = (): ValidationResult => {
  const value = process.env.NEXT_PUBLIC_API_PORT || '';
  const isSet = value !== '';

  if (!isSet) {
    return {
      name: 'NEXT_PUBLIC_API_PORT',
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Blank',
      category: 'API Configuration',
    };
  }

  const numValue = Number(value);
  if (isNaN(numValue) || numValue <= 0) {
    return {
      name: 'NEXT_PUBLIC_API_PORT',
      isSet: true,
      isValid: false,
      isRequired: false,
      message: `Invalid number: "${value}"`,
      category: 'API Configuration',
    };
  }

  return {
    name: 'NEXT_PUBLIC_API_PORT',
    isSet: true,
    isValid: true,
    isRequired: false,
    message: 'Set',
    category: 'API Configuration',
  };
};

/**
 * Validates all environment variables and returns a comprehensive summary
 */
const validateAllEnvironmentVariables = (): ValidationSummary => {
  const results: ValidationResult[] = [];

  // API Configuration
  results.push(validateRequired('NEXT_PUBLIC_API_PROTOCOL', 'API Configuration'));
  results.push(validateRequired('NEXT_PUBLIC_API_HOST', 'API Configuration'));
  results.push(validateApiPort());
  results.push(validateRequired('NEXT_PUBLIC_API_PREFIX', 'API Configuration'));
  results.push(validateRequired('NEXT_PUBLIC_API_VERSION', 'API Configuration'));

  // Brand & Features
  results.push(validateOptional('NEXT_PUBLIC_BRAND_NAME', 'Brand & Features', 'Blank'));
  results.push(
    validateSupportedLocalesList('NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES', 'Brand & Features')
  );
  results.push(validateLocale('NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE', 'Brand & Features', true));

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
 * Displays validation results in a formatted table
 */
const displayValidationResults = (summary: ValidationSummary): void => {
  console.log('\n=== Environment Variable Validation ===');

  // Group results by category
  const byCategory = summary.results.reduce(
    (acc, result) => {
      if (!acc[result.category]) {
        acc[result.category] = [];
      }
      acc[result.category].push(result);
      return acc;
    },
    {} as Record<string, ValidationResult[]>
  );

  // Display by category
  const categories = Object.keys(byCategory).sort();
  for (const category of categories) {
    console.log(`[${category}]`);
    for (const result of byCategory[category]) {
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
  console.log('\n=== Validation Summary ===');
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
    console.error('\nThe following environment variables failed validation:');
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

  if (summary.requiredMissing > 0) {
    console.error('\n❌ Build aborted: Required environment variables are missing or invalid.');
    console.error('Please set these variables in your .env file or environment.\n');
  }
};

/**
 * Main validation function
 */
const validateEnvVars = (): void => {
  console.log('Running startup validation...');

  const summary = validateAllEnvironmentVariables();
  displayValidationResults(summary);

  if (summary.requiredMissing > 0) {
    process.exit(1);
  }

  console.log('✅ All required environment variables are set and valid\n');
};

// Run validation
validateEnvVars();
