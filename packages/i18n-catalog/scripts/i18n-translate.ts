import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import { config } from 'dotenv';
import { OpenAI } from 'openai';

type JsonPrimitive = string | number | boolean | null;
type JsonValue = JsonPrimitive | JsonObject | JsonValue[];
type JsonObject = { [key: string]: JsonValue };

const SOURCE_LOCALE = 'en-US';
const TARGETS = [
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'el-GR', name: 'Greek' },
];
const LAYERS = ['shared', 'consumer', 'management', 'mobile'] as const;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PACKAGE_ROOT = path.resolve(__dirname, '..');
const MONOREPO_ROOT = path.resolve(PACKAGE_ROOT, '../..');

config({ path: path.join(MONOREPO_ROOT, '.env.openai') });

if (!process.env.OPENAI_API_KEY) {
  throw new Error('OPENAI_API_KEY missing. Add it to .env.openai before running i18n:translate.');
}

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

function cleanTranslation(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length >= 2 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

type StringLeaf = {
  keyPath: string;
  value: string;
};

function collectStringLeaves(source: JsonValue, prefix = ''): StringLeaf[] {
  if (typeof source === 'string') {
    return [{ keyPath: prefix, value: source }];
  }
  if (Array.isArray(source) || source === null || typeof source !== 'object') {
    return [];
  }

  const leaves: StringLeaf[] = [];
  for (const key of Object.keys(source)) {
    const nextPrefix = prefix ? `${prefix}.${key}` : key;
    leaves.push(...collectStringLeaves(source[key], nextPrefix));
  }

  return leaves;
}

function getAtPath(obj: JsonValue, keyPath: string): JsonValue | undefined {
  const parts = keyPath.split('.');
  let current: JsonValue | undefined = obj;

  for (const part of parts) {
    if (!current || typeof current !== 'object' || Array.isArray(current) || !(part in current)) {
      return undefined;
    }
    current = current[part];
  }

  return current;
}

function setAtPath(obj: JsonObject, keyPath: string, value: string): void {
  const parts = keyPath.split('.');
  let current: JsonObject = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    const next = current[part];
    if (!next || typeof next !== 'object' || Array.isArray(next)) {
      current[part] = {};
    }
    current = current[part] as JsonObject;
  }

  current[parts[parts.length - 1]] = value;
}

async function translateBatch(
  items: StringLeaf[],
  targetLanguage: string
): Promise<Record<string, string>> {
  if (items.length === 0) {
    return {};
  }

  const payload = items.reduce<Record<string, string>>((acc, item) => {
    acc[item.keyPath] = item.value;
    return acc;
  }, {});

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    response_format: { type: 'json_object' },
    messages: [
      {
        role: 'system',
        content:
          'You are a professional software localization translator. Keep placeholders like {name} unchanged and return only valid JSON.',
      },
      {
        role: 'user',
        content: `Translate all values to ${targetLanguage}:\n${JSON.stringify(payload, null, 2)}`,
      },
    ],
  });

  const content = response.choices[0]?.message?.content?.trim() ?? '{}';
  const parsed = JSON.parse(content) as Record<string, string>;

  const result: Record<string, string> = {};
  for (const item of items) {
    const translated = parsed[item.keyPath];
    if (typeof translated === 'string') {
      result[item.keyPath] = cleanTranslation(translated);
    }
  }
  return result;
}

async function translateLayerLocale(
  layer: string,
  localeCode: string,
  localeName: string
): Promise<void> {
  const sourcePath = path.join(PACKAGE_ROOT, layer, 'originals', `${SOURCE_LOCALE}.json`);
  const targetPath = path.join(PACKAGE_ROOT, layer, 'originals', `${localeCode}.json`);
  const source = parseJsonFile(sourcePath);
  const existing = fs.existsSync(targetPath) ? parseJsonFile(targetPath) : {};
  const sourceLeaves = collectStringLeaves(source);
  const pending = sourceLeaves.filter((leaf) => {
    const existingValue = getAtPath(existing, leaf.keyPath);
    return typeof existingValue !== 'string' || existingValue === '';
  });

  const translatedObject: JsonObject = JSON.parse(JSON.stringify(existing));
  const batchSize = 50;
  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    const translated = await translateBatch(batch, localeName);
    for (const [keyPath, value] of Object.entries(translated)) {
      setAtPath(translatedObject, keyPath, value);
    }
  }

  for (const leaf of sourceLeaves) {
    const currentValue = getAtPath(translatedObject, leaf.keyPath);
    if (typeof currentValue !== 'string' || currentValue === '') {
      setAtPath(translatedObject, leaf.keyPath, leaf.value);
    }
  }

  writeJsonFile(targetPath, translatedObject);
}

async function main(): Promise<void> {
  for (const layer of LAYERS) {
    for (const target of TARGETS) {
      console.info(`🌍 Translating ${layer} → ${target.code}`);
      await translateLayerLocale(layer, target.code, target.name);
    }
  }

  console.info('✅ i18n-catalog translate complete');
}

void main();
