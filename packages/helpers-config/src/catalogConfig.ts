import type { ValidationResult } from '@podverse/helpers';

/** `process.env` or the web runtime-config map, which has no string index signature. */
type EnvSource = object;

export type CatalogConfig = {
  /** False when `<prefix>CATALOG_MUSIC_DISABLED` is `true`. */
  musicEnabled: boolean;
  /** False when `<prefix>CATALOG_ADD_BY_RSS_DISABLED` is `true`. */
  addByRSSEnabled: boolean;
  /** Null when no allowlist is set. Otherwise the Podcast Index feed ids the instance adds. */
  podcastIndexIdAllowlist: readonly number[] | null;
};

/** `''` for the API and the workers; `'NEXT_PUBLIC_'` for the web app and its sidecar. */
export type CatalogEnvKeyPrefix = '' | 'NEXT_PUBLIC_';

export const CATALOG_VALIDATION_CATEGORY = 'Catalog';

const ALLOWLIST_SEPARATOR = /[\s,]+/;
const PODCAST_INDEX_ID_TOKEN = /^[1-9]\d*$/;

function readRaw(env: EnvSource, key: string): string | undefined {
  for (const [entryKey, value] of Object.entries(env)) {
    if (entryKey === key && typeof value === 'string') {
      return value;
    }
  }
  return undefined;
}

function hasText(raw: string | undefined): raw is string {
  return raw !== undefined && raw.trim() !== '';
}

function isValidPodcastIndexIdToken(token: string): boolean {
  if (!PODCAST_INDEX_ID_TOKEN.test(token)) {
    return false;
  }
  return Number.isSafeInteger(Number(token));
}

function splitAllowlistTokens(raw: string): string[] {
  return raw.split(ALLOWLIST_SEPARATOR).filter((token) => token !== '');
}

function catalogResult(
  key: string,
  fields: Pick<ValidationResult, 'isSet' | 'isValid' | 'isRequired' | 'message'>
): ValidationResult {
  return {
    name: key,
    category: CATALOG_VALIDATION_CATEGORY,
    ...fields,
  };
}

/** Podcast Index feed ids. Blank means no allowlist. Invalid tokens are dropped. */
export function parseCatalogPodcastIndexIdAllowlist(raw: string | undefined): number[] | null {
  if (!hasText(raw)) {
    return null;
  }
  const ids: number[] = [];
  const seen = new Set<number>();
  for (const token of splitAllowlistTokens(raw)) {
    if (!isValidPodcastIndexIdToken(token)) {
      continue;
    }
    const id = Number(token);
    if (seen.has(id)) {
      continue;
    }
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

export function buildCatalogConfigFromEnv(
  env: EnvSource,
  prefix: CatalogEnvKeyPrefix
): CatalogConfig {
  return {
    musicEnabled: readRaw(env, `${prefix}CATALOG_MUSIC_DISABLED`)?.trim() !== 'true',
    addByRSSEnabled: readRaw(env, `${prefix}CATALOG_ADD_BY_RSS_DISABLED`)?.trim() !== 'true',
    podcastIndexIdAllowlist: parseCatalogPodcastIndexIdAllowlist(
      readRaw(env, `${prefix}CATALOG_PODCAST_INDEX_ID_ALLOWLIST`)
    ),
  };
}

export function validateCatalogDisabledFlag(env: EnvSource, key: string): ValidationResult {
  const raw = readRaw(env, key);
  if (!hasText(raw)) {
    return catalogResult(key, {
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Blank (on)',
    });
  }
  const trimmed = raw.trim();
  if (trimmed === 'true') {
    return catalogResult(key, {
      isSet: true,
      isValid: true,
      isRequired: false,
      message: 'Set to true (off)',
    });
  }
  if (trimmed === 'false') {
    return catalogResult(key, {
      isSet: true,
      isValid: true,
      isRequired: false,
      message: 'Set to false (on)',
    });
  }
  return catalogResult(key, {
    isSet: true,
    isValid: false,
    isRequired: true,
    message: `Invalid value: "${raw}" - must be "true" or "false"`,
  });
}

export function validateCatalogPodcastIndexIdAllowlist(
  env: EnvSource,
  key: string
): ValidationResult {
  const raw = readRaw(env, key);
  if (!hasText(raw)) {
    return catalogResult(key, {
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Blank (no allowlist)',
    });
  }
  const tokens = splitAllowlistTokens(raw);
  if (tokens.length === 0) {
    return catalogResult(key, {
      isSet: true,
      isValid: false,
      isRequired: true,
      message: 'Empty after parsing - use comma-separated positive integers',
    });
  }
  const invalidTokens = tokens.filter((token) => !isValidPodcastIndexIdToken(token));
  if (invalidTokens.length > 0) {
    const listed = invalidTokens.join(', ');
    return catalogResult(key, {
      isSet: true,
      isValid: false,
      isRequired: true,
      message: `Invalid Podcast Index id(s): ${listed} - use comma-separated positive integers`,
    });
  }
  const ids = parseCatalogPodcastIndexIdAllowlist(raw);
  const count = ids === null ? 0 : ids.length;
  return catalogResult(key, {
    isSet: true,
    isValid: true,
    isRequired: false,
    message: `${count} Podcast Index id(s)`,
  });
}

export function validateCatalogEnv(
  env: EnvSource,
  prefix: CatalogEnvKeyPrefix
): ValidationResult[] {
  return [
    validateCatalogDisabledFlag(env, `${prefix}CATALOG_MUSIC_DISABLED`),
    validateCatalogDisabledFlag(env, `${prefix}CATALOG_ADD_BY_RSS_DISABLED`),
    validateCatalogPodcastIndexIdAllowlist(env, `${prefix}CATALOG_PODCAST_INDEX_ID_ALLOWLIST`),
  ];
}
