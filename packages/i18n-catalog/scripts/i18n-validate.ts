import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type JsonValue = string | number | boolean | null | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };
type LayerName = 'shared' | 'consumer' | 'management' | 'mobile';

const REQUIRED_LOCALES = ['en-US', 'es', 'fr', 'el-GR'] as const;
const SOURCE_LOCALE = 'en-US';
const LAYERS: LayerName[] = ['shared', 'consumer', 'management', 'mobile'];

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..');

type ValidationError = {
  type: string;
  message: string;
};

const errors: ValidationError[] = [];

function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonObject(filePath: string): JsonObject {
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (!isJsonObject(parsed)) {
    throw new Error(`Expected JSON object at ${filePath}`);
  }
  return parsed;
}

function getLeafKeys(obj: JsonObject, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key of Object.keys(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (isJsonObject(value)) {
      keys.push(...getLeafKeys(value, fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

function valueAtPath(obj: JsonObject, keyPath: string): JsonValue | undefined {
  const parts = keyPath.split('.');
  let current: JsonValue = obj;
  for (const part of parts) {
    if (!isJsonObject(current) || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }
  return current;
}

function layerPath(layer: LayerName, section: 'originals' | 'overrides', locale: string): string {
  return path.join(PACKAGE_ROOT, layer, section, `${locale}.json`);
}

function validateLayerLocaleStructure(layer: LayerName, locale: string): void {
  const originalsPath = layerPath(layer, 'originals', locale);
  if (!fs.existsSync(originalsPath)) {
    errors.push({ type: 'missing_file', message: `${layer}/originals/${locale}.json is missing` });
    return;
  }

  const originals = parseJsonObject(originalsPath);
  if (locale !== SOURCE_LOCALE) {
    const overridesPath = layerPath(layer, 'overrides', locale);
    if (!fs.existsSync(overridesPath)) {
      errors.push({
        type: 'missing_file',
        message: `${layer}/overrides/${locale}.json is missing`,
      });
      return;
    }

    const overrides = parseJsonObject(overridesPath);
    const originalKeys = getLeafKeys(originals);
    const overrideKeys = getLeafKeys(overrides);
    const missingOverrideKeys = originalKeys.filter((key) => !overrideKeys.includes(key));
    const extraOverrideKeys = overrideKeys.filter((key) => !originalKeys.includes(key));

    if (missingOverrideKeys.length > 0) {
      errors.push({
        type: 'override_key_mismatch',
        message: `${layer}/overrides/${locale}.json missing ${missingOverrideKeys.length} keys`,
      });
    }
    if (extraOverrideKeys.length > 0) {
      errors.push({
        type: 'override_key_mismatch',
        message: `${layer}/overrides/${locale}.json has ${extraOverrideKeys.length} extra keys`,
      });
    }
  }
}

function validateLayerTranslations(layer: LayerName): void {
  const sourcePath = layerPath(layer, 'originals', SOURCE_LOCALE);
  if (!fs.existsSync(sourcePath)) {
    errors.push({
      type: 'missing_file',
      message: `${layer}/originals/${SOURCE_LOCALE}.json is missing`,
    });
    return;
  }

  const source = parseJsonObject(sourcePath);
  const sourceKeys = getLeafKeys(source);

  for (const key of sourceKeys) {
    if (valueAtPath(source, key) === '') {
      errors.push({
        type: 'empty_value',
        message: `${layer}/originals/en-US.json has empty value at ${key}`,
      });
    }
  }

  for (const locale of REQUIRED_LOCALES) {
    if (locale === SOURCE_LOCALE) {
      continue;
    }

    const localePath = layerPath(layer, 'originals', locale);
    if (!fs.existsSync(localePath)) {
      errors.push({
        type: 'missing_file',
        message: `${layer}/originals/${locale}.json is missing`,
      });
      continue;
    }

    const localeData = parseJsonObject(localePath);
    const localeKeys = getLeafKeys(localeData);
    const missingKeys = sourceKeys.filter((key) => !localeKeys.includes(key));
    const extraKeys = localeKeys.filter((key) => !sourceKeys.includes(key));

    if (missingKeys.length > 0) {
      errors.push({
        type: 'key_mismatch',
        message: `${layer}/originals/${locale}.json missing ${missingKeys.length} keys from en-US`,
      });
    }
    if (extraKeys.length > 0) {
      errors.push({
        type: 'key_mismatch',
        message: `${layer}/originals/${locale}.json has ${extraKeys.length} extra keys not in en-US`,
      });
    }
  }
}

function collectKeysByLayer(locale: string): Record<LayerName, Set<string>> {
  const result = {
    shared: new Set<string>(),
    consumer: new Set<string>(),
    management: new Set<string>(),
    mobile: new Set<string>(),
  } as Record<LayerName, Set<string>>;

  for (const layer of LAYERS) {
    const originalsPath = layerPath(layer, 'originals', locale);
    if (!fs.existsSync(originalsPath)) {
      continue;
    }
    const keys = getLeafKeys(parseJsonObject(originalsPath));
    for (const key of keys) {
      result[layer].add(key);
    }
  }

  return result;
}

function validateLayerDuplicates(): void {
  for (const locale of REQUIRED_LOCALES) {
    const keySets = collectKeysByLayer(locale);

    const sharedConsumerDupes = [...keySets.shared].filter((key) => keySets.consumer.has(key));
    const sharedManagementDupes = [...keySets.shared].filter((key) => keySets.management.has(key));
    const consumerMobileDupes = [...keySets.consumer].filter((key) => keySets.mobile.has(key));

    if (sharedConsumerDupes.length > 0) {
      errors.push({
        type: 'duplicate_key_path',
        message: `duplicate keys in shared+consumer (${locale}): ${sharedConsumerDupes.slice(0, 5).join(', ')}`,
      });
    }
    if (sharedManagementDupes.length > 0) {
      errors.push({
        type: 'duplicate_key_path',
        message: `duplicate keys in shared+management (${locale}): ${sharedManagementDupes.slice(0, 5).join(', ')}`,
      });
    }
    if (consumerMobileDupes.length > 0) {
      errors.push({
        type: 'duplicate_key_path',
        message: `duplicate keys in consumer+mobile (${locale}): ${consumerMobileDupes.slice(0, 5).join(', ')}`,
      });
    }
  }
}

function main(): void {
  for (const layer of LAYERS) {
    for (const locale of REQUIRED_LOCALES) {
      validateLayerLocaleStructure(layer, locale);
    }
    validateLayerTranslations(layer);
  }

  validateLayerDuplicates();

  if (errors.length > 0) {
    console.error(`❌ i18n-catalog validation failed (${errors.length} errors)`);
    for (const error of errors) {
      console.error(`- [${error.type}] ${error.message}`);
    }
    process.exit(1);
  }

  console.info('✅ i18n-catalog validation passed');
}

main();
