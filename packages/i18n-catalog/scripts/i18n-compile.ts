import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

type LayerName = 'shared' | 'consumer' | 'management' | 'mobile';

const REQUIRED_LOCALES = ['en-US', 'es', 'fr', 'el-GR'] as const;
const SOURCE_LOCALE = 'en-US';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const MONOREPO_ROOT = path.resolve(PACKAGE_ROOT, '../..');

const LAYERS: LayerName[] = ['shared', 'consumer', 'management', 'mobile'];

const APP_TARGETS: Record<string, { layers: LayerName[]; outputDir: string }> = {
  web: {
    layers: ['shared', 'consumer'],
    outputDir: path.join(MONOREPO_ROOT, 'apps/web/i18n/compiled'),
  },
  management: {
    layers: ['shared', 'management'],
    outputDir: path.join(MONOREPO_ROOT, 'apps/management-web/i18n/compiled'),
  },
  mobile: {
    layers: ['shared', 'consumer', 'mobile'],
    outputDir: path.join(MONOREPO_ROOT, 'apps/mobile/i18n/compiled'),
  },
};

function isJsonObject(value: JsonValue | undefined): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseJsonFile(filePath: string): JsonObject {
  const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new Error(`Expected JSON object at ${filePath}`);
  }

  return parsed as JsonObject;
}

function writeJsonFile(filePath: string, value: JsonObject): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function syncOverrideStructure(originals: JsonValue, overrides: JsonValue | undefined): JsonValue {
  if (!isJsonObject(originals)) {
    if (typeof overrides === 'string' && overrides !== '') {
      return overrides;
    }
    return '';
  }

  const result: JsonObject = {};

  for (const key of Object.keys(originals)) {
    result[key] = syncOverrideStructure(
      originals[key],
      isJsonObject(overrides) ? overrides[key] : undefined
    );
  }

  return result;
}

function mergeForCompiled(originals: JsonValue, overrides: JsonValue | undefined): JsonValue {
  if (!isJsonObject(originals)) {
    if (typeof overrides === 'string' && overrides !== '') {
      return overrides;
    }
    return originals;
  }

  const result: JsonObject = {};
  for (const key of Object.keys(originals)) {
    result[key] = mergeForCompiled(
      originals[key],
      isJsonObject(overrides) ? overrides[key] : undefined
    );
  }

  return result;
}

function deepMerge(base: JsonObject, incoming: JsonObject): JsonObject {
  const result: JsonObject = { ...base };

  for (const key of Object.keys(incoming)) {
    const baseValue = result[key];
    const incomingValue = incoming[key];

    if (isJsonObject(baseValue) && isJsonObject(incomingValue)) {
      result[key] = deepMerge(baseValue, incomingValue);
    } else {
      result[key] = incomingValue;
    }
  }

  return result;
}

function layerPath(
  layer: LayerName,
  section: 'originals' | 'overrides' | 'compiled',
  locale: string
): string {
  return path.join(PACKAGE_ROOT, layer, section, `${locale}.json`);
}

function compileLayerLocale(layer: LayerName, locale: string): JsonObject {
  const originalsPath = layerPath(layer, 'originals', locale);
  const overridesPath = layerPath(layer, 'overrides', locale);
  const compiledPath = layerPath(layer, 'compiled', locale);

  const originals = parseJsonFile(originalsPath);

  if (locale === SOURCE_LOCALE) {
    writeJsonFile(compiledPath, originals);
    return originals;
  }

  const rawOverrides = fs.existsSync(overridesPath) ? parseJsonFile(overridesPath) : {};
  const syncedOverrides = syncOverrideStructure(originals, rawOverrides);
  const merged = mergeForCompiled(originals, syncedOverrides);

  if (!isJsonObject(syncedOverrides) || !isJsonObject(merged)) {
    throw new Error(`Unexpected non-object compile result for ${layer}/${locale}`);
  }

  writeJsonFile(overridesPath, syncedOverrides);
  writeJsonFile(compiledPath, merged);
  return merged;
}

function compileLayers(): Record<LayerName, Record<string, JsonObject>> {
  const compiledByLayer = {
    shared: {},
    consumer: {},
    management: {},
    mobile: {},
  } as Record<LayerName, Record<string, JsonObject>>;

  for (const layer of LAYERS) {
    for (const locale of REQUIRED_LOCALES) {
      compiledByLayer[layer][locale] = compileLayerLocale(layer, locale);
    }
  }

  return compiledByLayer;
}

function writeAppCompiledOutputs(
  compiledByLayer: Record<LayerName, Record<string, JsonObject>>
): void {
  for (const target of Object.values(APP_TARGETS)) {
    fs.mkdirSync(target.outputDir, { recursive: true });
    for (const locale of REQUIRED_LOCALES) {
      const merged = target.layers.reduce<JsonObject>((acc, layer) => {
        return deepMerge(acc, compiledByLayer[layer][locale]);
      }, {});

      writeJsonFile(path.join(target.outputDir, `${locale}.json`), merged);
    }
  }
}

function main(): void {
  const compiledByLayer = compileLayers();
  writeAppCompiledOutputs(compiledByLayer);
  console.info('✅ i18n-catalog compile complete');
}

main();
