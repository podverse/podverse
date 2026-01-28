#!/usr/bin/env npx ts-node

/**
 * i18n Validation Script
 *
 * Validates translation files across all apps to ensure:
 * 1. All required locale files exist in originals (en-US, es, fr, el-GR)
 * 2. Override files exist for non-source locales (es, fr, el-GR)
 * 3. All locale files have the same keys as en-US (source of truth)
 * 4. Keys are in the same order across all files
 * 5. No empty values in originals (overrides can have empty values)
 * 6. Override files have the same keys as originals
 *
 * Note: compiled/ is NOT validated - it's generated at build time
 */

import fs from 'fs';
import path from 'path';

// Apps that have i18n
const APPS_WITH_I18N = ['apps/web', 'apps/management-web'];

// Required locales (must match the targets in i18n-llm-translations.ts + en-US)
const REQUIRED_LOCALES = ['en-US', 'es', 'fr', 'el-GR'];

// Locales that need override files (all except source language)
const OVERRIDE_LOCALES = REQUIRED_LOCALES.filter((l) => l !== 'en-US');

interface ValidationError {
  app: string;
  type: 'missing_file' | 'key_mismatch' | 'key_order' | 'empty_value' | 'override_key_mismatch';
  message: string;
  details?: string;
}

const errors: ValidationError[] = [];

/**
 * Get all keys from a nested object as dot-notation paths
 */
function getKeys(obj: any, prefix = ''): string[] {
  const keys: string[] = [];

  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];

    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      keys.push(...getKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }

  return keys;
}

/**
 * Get value at a dot-notation path
 */
function getValueAtPath(obj: any, path: string): any {
  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === undefined || current === null) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Validate a single app's i18n files
 */
function validateApp(appPath: string): void {
  const appName = appPath;
  const i18nPath = path.join(process.cwd(), appPath, 'i18n');

  console.log(`\n📁 Validating ${appName}...`);

  // Check if i18n directory exists
  if (!fs.existsSync(i18nPath)) {
    errors.push({
      app: appName,
      type: 'missing_file',
      message: `i18n directory not found at ${i18nPath}`,
    });
    return;
  }

  const originalsDir = path.join(i18nPath, 'originals');
  const overridesDir = path.join(i18nPath, 'overrides');

  // Check originals directory exists
  if (!fs.existsSync(originalsDir)) {
    errors.push({
      app: appName,
      type: 'missing_file',
      message: 'Missing directory: originals',
    });
    return;
  }

  // Check overrides directory exists
  if (!fs.existsSync(overridesDir)) {
    errors.push({
      app: appName,
      type: 'missing_file',
      message: 'Missing directory: overrides',
    });
  }

  // Check all required locale files exist in originals
  for (const locale of REQUIRED_LOCALES) {
    const filePath = path.join(originalsDir, `${locale}.json`);
    if (!fs.existsSync(filePath)) {
      errors.push({
        app: appName,
        type: 'missing_file',
        message: `Missing file: originals/${locale}.json`,
      });
    }
  }

  // Check override files exist for non-source locales
  for (const locale of OVERRIDE_LOCALES) {
    const filePath = path.join(overridesDir, `${locale}.json`);
    if (!fs.existsSync(filePath)) {
      errors.push({
        app: appName,
        type: 'missing_file',
        message: `Missing file: overrides/${locale}.json`,
      });
    }
  }

  // Load en-US as the source of truth
  const enUSPath = path.join(originalsDir, 'en-US.json');
  if (!fs.existsSync(enUSPath)) {
    console.log(`  ⚠️  Skipping key validation - en-US.json not found`);
    return;
  }

  const enUS = JSON.parse(fs.readFileSync(enUSPath, 'utf-8'));
  const enUSKeys = getKeys(enUS);

  console.log(`  📊 Found ${enUSKeys.length} keys in en-US.json`);

  // Check en-US for empty values
  for (const key of enUSKeys) {
    const value = getValueAtPath(enUS, key);
    if (value === '') {
      errors.push({
        app: appName,
        type: 'empty_value',
        message: `originals/en-US.json has empty value at key: ${key}`,
      });
    }
  }

  // Validate each locale in originals (except en-US)
  for (const locale of REQUIRED_LOCALES) {
    if (locale === 'en-US') continue;

    const localePath = path.join(originalsDir, `${locale}.json`);
    if (!fs.existsSync(localePath)) continue;

    const localeData = JSON.parse(fs.readFileSync(localePath, 'utf-8'));
    const localeKeys = getKeys(localeData);

    // Check for key mismatch with en-US
    const missingKeys = enUSKeys.filter((k) => !localeKeys.includes(k));
    const extraKeys = localeKeys.filter((k) => !enUSKeys.includes(k));

    if (missingKeys.length > 0) {
      errors.push({
        app: appName,
        type: 'key_mismatch',
        message: `originals/${locale}.json is missing ${missingKeys.length} keys`,
        details: missingKeys.slice(0, 5).join(', ') + (missingKeys.length > 5 ? '...' : ''),
      });
    }

    if (extraKeys.length > 0) {
      errors.push({
        app: appName,
        type: 'key_mismatch',
        message: `originals/${locale}.json has ${extraKeys.length} extra keys not in en-US`,
        details: extraKeys.slice(0, 5).join(', ') + (extraKeys.length > 5 ? '...' : ''),
      });
    }

    // Check key ordering
    const commonKeys = enUSKeys.filter((k) => localeKeys.includes(k));
    const localeCommonKeys = localeKeys.filter((k) => enUSKeys.includes(k));

    let orderMismatch = false;
    for (let i = 0; i < commonKeys.length; i++) {
      if (commonKeys[i] !== localeCommonKeys[i]) {
        orderMismatch = true;
        break;
      }
    }

    if (orderMismatch) {
      errors.push({
        app: appName,
        type: 'key_order',
        message: `originals/${locale}.json has keys in different order than en-US.json`,
      });
    }

    // Check for empty values in originals (not allowed)
    for (const key of localeKeys) {
      const value = getValueAtPath(localeData, key);
      if (value === '') {
        errors.push({
          app: appName,
          type: 'empty_value',
          message: `originals/${locale}.json has empty value at key: ${key}`,
        });
      }
    }
  }

  // Validate override files have same structure as originals
  for (const locale of OVERRIDE_LOCALES) {
    const originalsPath = path.join(originalsDir, `${locale}.json`);
    const overridesPath = path.join(overridesDir, `${locale}.json`);

    if (!fs.existsSync(originalsPath) || !fs.existsSync(overridesPath)) continue;

    const originals = JSON.parse(fs.readFileSync(originalsPath, 'utf-8'));
    const overrides = JSON.parse(fs.readFileSync(overridesPath, 'utf-8'));

    const originalsKeys = getKeys(originals);
    const overridesKeys = getKeys(overrides);

    // Check override files have same keys as originals
    const missingInOverrides = originalsKeys.filter((k) => !overridesKeys.includes(k));
    const extraInOverrides = overridesKeys.filter((k) => !originalsKeys.includes(k));

    if (missingInOverrides.length > 0) {
      errors.push({
        app: appName,
        type: 'override_key_mismatch',
        message: `overrides/${locale}.json is missing ${missingInOverrides.length} keys from originals`,
        details:
          missingInOverrides.slice(0, 5).join(', ') + (missingInOverrides.length > 5 ? '...' : ''),
      });
    }

    if (extraInOverrides.length > 0) {
      errors.push({
        app: appName,
        type: 'override_key_mismatch',
        message: `overrides/${locale}.json has ${extraInOverrides.length} extra keys not in originals`,
        details:
          extraInOverrides.slice(0, 5).join(', ') + (extraInOverrides.length > 5 ? '...' : ''),
      });
    }

    // Check key ordering in overrides matches originals
    const commonKeys = originalsKeys.filter((k) => overridesKeys.includes(k));
    const overrideCommonKeys = overridesKeys.filter((k) => originalsKeys.includes(k));

    let orderMismatch = false;
    for (let i = 0; i < commonKeys.length; i++) {
      if (commonKeys[i] !== overrideCommonKeys[i]) {
        orderMismatch = true;
        break;
      }
    }

    if (orderMismatch) {
      errors.push({
        app: appName,
        type: 'key_order',
        message: `overrides/${locale}.json has keys in different order than originals/${locale}.json`,
      });
    }

    // Note: Empty values in overrides ARE allowed (they mean "use originals value")
  }

  console.log(`  ✅ Validation complete for ${appName}`);
}

/**
 * Main validation function
 */
function main(): void {
  console.log('🌐 i18n Validation');
  console.log('==================');
  console.log(`Required locales: ${REQUIRED_LOCALES.join(', ')}`);
  console.log(`Apps to validate: ${APPS_WITH_I18N.join(', ')}`);
  console.log('Note: compiled/ is generated at build time and not validated here');

  for (const app of APPS_WITH_I18N) {
    validateApp(app);
  }

  // Report results
  console.log('\n' + '='.repeat(50));

  if (errors.length === 0) {
    console.log('✅ All i18n validations passed!');
    process.exit(0);
  } else {
    console.log(`❌ Found ${errors.length} validation error(s):\n`);

    // Group errors by app
    const errorsByApp: Record<string, ValidationError[]> = {};
    for (const error of errors) {
      if (!errorsByApp[error.app]) {
        errorsByApp[error.app] = [];
      }
      errorsByApp[error.app].push(error);
    }

    for (const [app, appErrors] of Object.entries(errorsByApp)) {
      console.log(`\n📁 ${app}:`);
      for (const error of appErrors) {
        console.log(`  ❌ [${error.type}] ${error.message}`);
        if (error.details) {
          console.log(`     Details: ${error.details}`);
        }
      }
    }

    console.log('\n' + '='.repeat(50));
    console.log('💡 To fix these issues:');
    console.log('   1. Run `npm run i18n:translate` to generate missing translations');
    console.log('   2. Run `npm run i18n:compile` to sync override structure');
    console.log('   3. Ensure all locale files have matching keys in the same order as en-US.json');
    console.log('   4. Remove any empty string values from originals/ files');

    process.exit(1);
  }
}

main();
