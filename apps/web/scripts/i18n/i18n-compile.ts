import fs from 'fs';
import path from 'path';

/**
 * i18n Compile Script
 *
 * This script:
 * 1. Syncs override files to have the same structure as originals (with empty string defaults)
 * 2. Compiles originals + overrides into final compiled files
 *
 * Logic:
 * - en-US: No override file (source language) - just copy originals to compiled
 * - Other locales:
 *   - Override files have all keys with empty strings by default
 *   - Non-empty override values are human-provided and take precedence
 *   - Empty override values fall back to originals (LLM-generated)
 */

/**
 * Sync override structure to match originals.
 * - Adds missing keys with empty string values
 * - Removes keys not in originals
 * - Preserves existing non-empty override values (human input)
 */
function syncOverrideStructure(originals: any, overrides: any): any {
  if (typeof originals !== 'object' || originals === null) {
    return '';
  }

  const result: any = {};

  for (const key of Object.keys(originals)) {
    const originalVal = originals[key];
    const overrideVal = overrides?.[key];

    if (typeof originalVal === 'object' && originalVal !== null) {
      // Recurse for nested objects
      result[key] = syncOverrideStructure(originalVal, overrideVal);
    } else {
      // For leaf values:
      // - If override exists and is non-empty string, preserve it (human input)
      // - Otherwise, use empty string (default)
      if (typeof overrideVal === 'string' && overrideVal !== '') {
        result[key] = overrideVal;
      } else {
        result[key] = '';
      }
    }
  }

  return result;
}

/**
 * Merge originals with overrides to create compiled output.
 * - Empty override values fall back to originals
 * - Non-empty override values take precedence
 */
function mergeForCompiled(originals: any, overrides: any): any {
  if (typeof originals !== 'object' || originals === null) {
    // Leaf value
    if (typeof overrides === 'string' && overrides !== '') {
      return overrides;
    }
    return originals;
  }

  const result: any = {};

  for (const key of Object.keys(originals)) {
    const originalVal = originals[key];
    const overrideVal = overrides?.[key];

    if (typeof originalVal === 'object' && originalVal !== null) {
      result[key] = mergeForCompiled(originalVal, overrideVal);
    } else {
      // Use override if non-empty, otherwise use original
      if (typeof overrideVal === 'string' && overrideVal !== '') {
        result[key] = overrideVal;
      } else {
        result[key] = originalVal;
      }
    }
  }

  return result;
}

const originalsDir = path.resolve(__dirname, '../../i18n/originals');
const overridesDir = path.resolve(__dirname, '../../i18n/overrides');
const compiledDir = path.resolve(__dirname, '../../i18n/compiled');

// Ensure directories exist
if (!fs.existsSync(overridesDir)) {
  fs.mkdirSync(overridesDir, { recursive: true });
}

if (!fs.existsSync(compiledDir)) {
  fs.mkdirSync(compiledDir, { recursive: true });
}

// Get all locale files from originals
const locales = fs
  .readdirSync(originalsDir)
  .filter((f) => f.endsWith('.json'))
  .map((f) => f.replace('.json', ''));

for (const locale of locales) {
  const originalsPath = path.join(originalsDir, `${locale}.json`);
  const overridesPath = path.join(overridesDir, `${locale}.json`);
  const compiledPath = path.join(compiledDir, `${locale}.json`);

  const originals = JSON.parse(fs.readFileSync(originalsPath, 'utf8'));

  if (locale === 'en-US') {
    // en-US is source language - no overrides, just copy to compiled
    fs.writeFileSync(compiledPath, JSON.stringify(originals, null, 2), 'utf8');
    console.info(`Compiled ${locale}.json (source language)`);
  } else {
    // Load existing overrides if any
    let existingOverrides = {};
    if (fs.existsSync(overridesPath)) {
      existingOverrides = JSON.parse(fs.readFileSync(overridesPath, 'utf8'));
    }

    // Sync override structure (preserves human overrides, adds empty defaults for new keys)
    const syncedOverrides = syncOverrideStructure(originals, existingOverrides);
    fs.writeFileSync(overridesPath, JSON.stringify(syncedOverrides, null, 2), 'utf8');

    // Merge originals + overrides for compiled output
    const compiled = mergeForCompiled(originals, syncedOverrides);
    fs.writeFileSync(compiledPath, JSON.stringify(compiled, null, 2), 'utf8');

    console.info(`Compiled ${locale}.json`);
  }
}

console.info('\n✅ i18n compile complete');
