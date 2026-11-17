import { parseMobileApiConnection } from './parseApiConnection';

/** HTTP status the versioned health route returns when the process is up. */
export const CUSTOM_API_EXPECTED_HEALTH_STATUS = 200;

export type CustomApiCommitPlan =
  | { action: 'unchanged' }
  | { action: 'clear' }
  | { action: 'invalid' }
  | { action: 'probe'; baseUrl: string };

export type CustomApiHealthVerdict =
  { kind: 'ok' } | { kind: 'unexpected_status'; status: number } | { kind: 'unexpected_body' };

/**
 * Canonical absolute API base URL (`http://host/api/v2`), or null when the text cannot be one.
 * Rejects userinfo, query strings, and hashes so a saved value is only an origin plus the API path.
 */
export const normalizeCustomApiBaseUrl = (raw: string): string | null => {
  const trimmed = raw.trim();
  if (trimmed === '') {
    return null;
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return null;
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return null;
  }

  if (parsed.username !== '' || parsed.password !== '') {
    return null;
  }

  if (parsed.search !== '' || parsed.hash !== '') {
    return null;
  }

  const pathname = parsed.pathname.replace(/\/+$/, '');
  const canonical = `${parsed.origin}${pathname}`;
  if (parseMobileApiConnection(canonical) === null) {
    return null;
  }

  return canonical;
};

/**
 * A stored override is used only when it is a different server from the build's API address.
 * The same address is not an override: the notice would claim a custom server that is the usual one.
 */
export const acceptStoredCustomApiBaseUrl = (
  stored: string | null,
  builtIn: string | null
): string | null => {
  if (stored === null) {
    return null;
  }

  const normalized = normalizeCustomApiBaseUrl(stored);
  if (normalized === null) {
    return null;
  }

  if (builtIn !== null) {
    const builtInNormalized = normalizeCustomApiBaseUrl(builtIn);
    if (builtInNormalized !== null && builtInNormalized === normalized) {
      return null;
    }
  }

  return normalized;
};

/**
 * What Save should do with the field. Empty text and the build's own address both restore the
 * original. A different well-formed address still has to pass the health probe before it is kept.
 */
export const planCustomApiCommit = (
  draft: string,
  savedOverride: string | null,
  builtIn: string | null
): CustomApiCommitPlan => {
  const trimmed = draft.trim();
  if (trimmed === '') {
    return savedOverride === null ? { action: 'unchanged' } : { action: 'clear' };
  }

  const normalized = normalizeCustomApiBaseUrl(trimmed);
  if (normalized === null) {
    return { action: 'invalid' };
  }

  const accepted = acceptStoredCustomApiBaseUrl(normalized, builtIn);
  if (accepted === null) {
    return savedOverride === null ? { action: 'unchanged' } : { action: 'clear' };
  }

  if (accepted === savedOverride) {
    return { action: 'unchanged' };
  }

  return { action: 'probe', baseUrl: accepted };
};

/** True when committing this plan replaces the saved address and must erase local data first. */
export const customApiCommitOpensClearScreen = (
  plan: CustomApiCommitPlan
): plan is { action: 'clear' } | { action: 'probe'; baseUrl: string } => {
  return plan.action === 'clear' || plan.action === 'probe';
};

export const isUnknownRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const isHealthOkBody = (data: unknown): boolean => {
  if (!isUnknownRecord(data)) {
    return false;
  }

  return data.status === 'ok';
};

/** The probe passes only for HTTP 200 whose JSON body reports `status: ok`. */
export const judgeCustomApiHealthResponse = (
  status: number,
  data: unknown
): CustomApiHealthVerdict => {
  if (status !== CUSTOM_API_EXPECTED_HEALTH_STATUS) {
    return { kind: 'unexpected_status', status };
  }

  if (!isHealthOkBody(data)) {
    return { kind: 'unexpected_body' };
  }

  return { kind: 'ok' };
};

export const customApiHealthUrl = (baseUrl: string): string => `${baseUrl}/health`;
