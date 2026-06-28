import type { ValidationResult } from './startupValidation.js';

/** Sidebar accordion groups (matches LocalSettings sidebar accordion keys). */
export const SIDEBAR_GROUP_KEYS = ['podcasts', 'music', 'addByRSS', 'library'] as const;

export type SidebarGroupKey = (typeof SIDEBAR_GROUP_KEYS)[number];

const ALLOWED = new Set<string>(SIDEBAR_GROUP_KEYS);

export const DEFAULT_SIDEBAR_GROUP_ORDER: readonly SidebarGroupKey[] = SIDEBAR_GROUP_KEYS;

export type ParsedSidebarGroupOrder =
  { ok: true; order: SidebarGroupKey[] } | { ok: false; message: string };

/**
 * Validates a non-empty comma-separated order string (no leading/trailing whitespace on whole string).
 */
export function parseSidebarGroupOrderStrict(trimmed: string): ParsedSidebarGroupOrder {
  const segments = trimmed.split(',');
  const tokens = segments.map((s) => s.trim());
  if (tokens.some((t) => t === '')) {
    return { ok: false, message: 'Empty segment in list' };
  }
  if (tokens.length !== SIDEBAR_GROUP_KEYS.length) {
    return {
      ok: false,
      message: `Expected exactly ${SIDEBAR_GROUP_KEYS.length} groups, got ${tokens.length}`,
    };
  }
  const seen = new Set<string>();
  for (const t of tokens) {
    if (!ALLOWED.has(t)) {
      return { ok: false, message: `Unknown group "${t}"` };
    }
    if (seen.has(t)) {
      return { ok: false, message: `Duplicate group "${t}"` };
    }
    seen.add(t);
  }
  return { ok: true, order: tokens as SidebarGroupKey[] };
}

/**
 * Returns default order when unset or blank; otherwise parses and throws if invalid.
 */
export function parseSidebarGroupOrder(raw: string | undefined): SidebarGroupKey[] {
  if (raw === undefined || raw.trim() === '') {
    return [...DEFAULT_SIDEBAR_GROUP_ORDER];
  }
  const parsed = parseSidebarGroupOrderStrict(raw.trim());
  if (!parsed.ok) {
    throw new Error(`Invalid NEXT_PUBLIC_SIDEBAR_GROUP_ORDER: ${parsed.message}`);
  }
  return parsed.order;
}

/**
 * Sidecar startup validation for optional env `NEXT_PUBLIC_SIDEBAR_GROUP_ORDER`.
 */
export function validateSidebarGroupOrderOptionalEnv(
  key: string,
  category: string
): ValidationResult {
  const value = process.env[key];
  const isSet =
    value !== undefined && value !== null && typeof value === 'string' && value.trim() !== '';

  if (!isSet) {
    return {
      name: key,
      isSet: false,
      isValid: true,
      isRequired: false,
      message: 'Use default order (podcasts,music,addByRSS,library)',
      category,
    };
  }

  const parsed = parseSidebarGroupOrderStrict(value.trim());
  if (parsed.ok) {
    return {
      name: key,
      isSet: true,
      isValid: true,
      isRequired: false,
      message: `Set to ${value.trim()}`,
      category,
    };
  }

  return {
    name: key,
    isSet: true,
    isValid: false,
    isRequired: false,
    message: `Invalid value: "${value}" — ${parsed.message}`,
    category,
  };
}
