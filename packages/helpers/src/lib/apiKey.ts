import { DATABASE_CONSTANTS } from './constants/databaseConstants.js';
import type { CrudAction } from './crudBitmask.js';
import {
  CRUD_BITS,
  CRUD_MASK_ALL,
  CRUD_MASK_NONE,
  crudMaskHas,
  isCrudMask,
} from './crudBitmask.js';
import { ONE_DAY_MS, ONE_MINUTE_MS } from './timeConstants.js';

/** Every key starts with this, so the API tells a key from a session JWT before verifying it. */
export const API_KEY_TOKEN_PREFIX = 'pvk_';
/** Random bytes after the prefix, base64url-encoded (43 characters). */
export const API_KEY_SECRET_BYTES = 32;
/** Trailing characters of the token kept on the row so the owner can tell keys apart. */
export const API_KEY_TOKEN_HINT_LENGTH = 4;

const API_KEY_TOKEN_PATTERN = new RegExp(`^${API_KEY_TOKEN_PREFIX}[A-Za-z0-9_-]{43}$`);

export function hasApiKeyTokenPrefix(value: string): boolean {
  return value.startsWith(API_KEY_TOKEN_PREFIX);
}

/** `pvk_` followed by exactly 43 base64url characters. */
export function isApiKeyTokenFormat(value: string): boolean {
  return API_KEY_TOKEN_PATTERN.test(value);
}

/** `pvk_…` plus the stored hint, for display. */
export function formatApiKeyTokenHint(tokenHint: string): string {
  return `${API_KEY_TOKEN_PREFIX}…${tokenHint}`;
}

/**
 * Resources a key can grant, in the order web and mobile display them.
 *
 * - `account`: `GET /auth/me`, profile edits, the account's public profile, its own profile
 *   lists, and the queue history limit notice. Never password, email, deletion, terms, or the
 *   data export.
 * - `settings`: locale, playback, notification settings, and device auto-download (writes only;
 *   settings are read through `GET /auth/me`). Never the listen-stats consent.
 * - `subscriptions`: followed podcasts, accounts, and playlists; subscribed lists; seen state; OPML
 *   import and export.
 * - `add_by_rss`: followed Add by RSS channels, their chapters and transcripts, and parse requests
 *   (including on-demand add and refresh).
 * - `playlists`: the account's playlists, their items, and likes.
 * - `queue`: the queue, now playing, and the queue's history zone.
 * - `history`: the content log and the taste profile. Never listen or open reports
 *   (`/stats/listen`, `/stats/open`).
 * - `clips`: the account's clips.
 * - `notifications`: the inbox, its event stream, preferences, notification channels, and push
 *   devices.
 *
 * Every resource stores a full 0-15 mask. Which of its four actions any route uses is
 * `API_KEY_SUPPORTED_ACTIONS`.
 */
export const API_KEY_RESOURCES = [
  'account',
  'settings',
  'subscriptions',
  'add_by_rss',
  'playlists',
  'queue',
  'history',
  'clips',
  'notifications',
] as const;
export type ApiKeyResource = (typeof API_KEY_RESOURCES)[number];

export function isApiKeyResource(value: unknown): value is ApiKeyResource {
  return API_KEY_RESOURCES.some((resource) => resource === value);
}

/**
 * The actions some route checks for each resource, in CRUD_ACTIONS order. Web and mobile render a
 * checkbox for each listed action and a dash in every other cell; the OpenAPI spec describes the
 * same list. A stored mask may still hold an unlisted bit (presets set every bit); it opens
 * nothing until a route starts checking that action.
 */
export const API_KEY_SUPPORTED_ACTIONS: Readonly<Record<ApiKeyResource, readonly CrudAction[]>> = {
  account: ['read', 'update'],
  settings: ['update'],
  subscriptions: ['create', 'read', 'update', 'delete'],
  add_by_rss: ['create', 'read', 'delete'],
  playlists: ['create', 'read', 'update', 'delete'],
  queue: ['create', 'read', 'update', 'delete'],
  history: ['read', 'update'],
  clips: ['create', 'read', 'update', 'delete'],
  notifications: ['create', 'read', 'update', 'delete'],
};

export function apiKeyResourceSupportsAction(
  resource: ApiKeyResource,
  action: CrudAction
): boolean {
  return API_KEY_SUPPORTED_ACTIONS[resource].includes(action);
}

/** A CRUD mask per resource. Stored keys and DTOs always carry every resource. */
export type ApiKeyPermissions = Record<ApiKeyResource, number>;
/** What one route needs from a key. */
export type ApiKeyPermissionRequirement = { resource: ApiKeyResource; action: CrudAction };

export function emptyApiKeyPermissions(): ApiKeyPermissions {
  return {
    account: CRUD_MASK_NONE,
    settings: CRUD_MASK_NONE,
    subscriptions: CRUD_MASK_NONE,
    add_by_rss: CRUD_MASK_NONE,
    playlists: CRUD_MASK_NONE,
    queue: CRUD_MASK_NONE,
    history: CRUD_MASK_NONE,
    clips: CRUD_MASK_NONE,
    notifications: CRUD_MASK_NONE,
  };
}

/**
 * Reads a stored or submitted object. Unknown resources are dropped; a missing resource or a value
 * that is not a CRUD mask reads as 0. Bits outside API_KEY_SUPPORTED_ACTIONS are kept. Never
 * throws.
 */
export function normalizeApiKeyPermissions(value: unknown): ApiKeyPermissions {
  const permissions = emptyApiKeyPermissions();
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return permissions;
  }
  for (const resource of API_KEY_RESOURCES) {
    const raw: unknown = Reflect.get(value, resource);
    if (isCrudMask(raw)) {
      permissions[resource] = raw;
    }
  }
  return permissions;
}

/** True when the stored mask includes the action, including a bit no route checks yet. */
export function apiKeyPermissionsAllow(
  permissions: ApiKeyPermissions,
  requirement: ApiKeyPermissionRequirement
): boolean {
  return crudMaskHas(permissions[requirement.resource], requirement.action);
}

/**
 * True when at least one cell that API_KEY_SUPPORTED_ACTIONS lists is set. Unsupported bits do not
 * count. The create endpoint, the web form, and the mobile form all use this one check.
 */
export function apiKeyPermissionsGrantSupported(permissions: ApiKeyPermissions): boolean {
  for (const resource of API_KEY_RESOURCES) {
    for (const action of API_KEY_SUPPORTED_ACTIONS[resource]) {
      if (crudMaskHas(permissions[resource], action)) {
        return true;
      }
    }
  }
  return false;
}

export const API_KEY_PRESET_IDS = ['read_only', 'full_access'] as const;
export type ApiKeyPresetId = (typeof API_KEY_PRESET_IDS)[number];

/**
 * read_only stores CRUD_BITS.read on every resource. full_access stores CRUD_MASK_ALL on every
 * resource. Both keep bits outside API_KEY_SUPPORTED_ACTIONS, so a key made from a preset picks up
 * an action as soon as a route starts checking it. full_access does not reach key management,
 * password, email, account deletion, or billing; those routes do not accept a key.
 */
export function apiKeyPermissionsForPreset(presetId: ApiKeyPresetId): ApiKeyPermissions {
  const mask = maskForPreset(presetId);
  const permissions = emptyApiKeyPermissions();
  for (const resource of API_KEY_RESOURCES) {
    permissions[resource] = mask;
  }
  return permissions;
}

/** The preset these permissions equal exactly, or null (the clients show "Custom"). */
export function findApiKeyPresetId(permissions: ApiKeyPermissions): ApiKeyPresetId | null {
  for (const presetId of API_KEY_PRESET_IDS) {
    if (sameApiKeyPermissions(permissions, apiKeyPermissionsForPreset(presetId))) {
      return presetId;
    }
  }
  return null;
}

/** Days until a new key expires; null means it never expires. */
export const API_KEY_EXPIRATION_DAYS_OPTIONS = [30, 90, 365, null] as const;
export type ApiKeyExpirationDays = (typeof API_KEY_EXPIRATION_DAYS_OPTIONS)[number];
export const API_KEY_DEFAULT_EXPIRATION_DAYS: ApiKeyExpirationDays = 90;

export function isApiKeyExpirationDays(value: unknown): value is ApiKeyExpirationDays {
  return API_KEY_EXPIRATION_DAYS_OPTIONS.some((option) => option === value);
}

/** `createdAt` plus that many days, or null when the key never expires. */
export function apiKeyExpiresAt(createdAt: Date, days: ApiKeyExpirationDays): Date | null {
  if (days === null) {
    return null;
  }
  return new Date(createdAt.getTime() + days * ONE_DAY_MS);
}

/** False for null. A string is parsed as an ISO date. At or before `now` is expired. */
export function isApiKeyExpired(expiresAt: Date | string | null, now: Date): boolean {
  if (expiresAt === null) {
    return false;
  }
  const expiresAtMs =
    typeof expiresAt === 'string' ? new Date(expiresAt).getTime() : expiresAt.getTime();
  return expiresAtMs <= now.getTime();
}

export const API_KEY_NAME_MAX_LENGTH = DATABASE_CONSTANTS.varchar_short; // 50
/** Keys an account may hold, expired ones included. Creating one more answers 409. */
export const API_KEY_MAX_PER_ACCOUNT = 20;
/** last_used_at is written at most once per this interval of use. */
export const API_KEY_LAST_USED_INTERVAL_MS = 5 * ONE_MINUTE_MS;

export const API_KEY_ERROR_CODES = {
  /** 401: unknown, malformed, or revoked key. */
  invalid: 'api_key_invalid',
  /** 401: the key's expiry has passed. */
  expired: 'api_key_expired',
  /** 403: this route never accepts a key. */
  notAllowed: 'api_key_not_allowed',
  /** 403: the key lacks the permission the route needs; the body names it. */
  permissionDenied: 'api_key_permission_denied',
  /** 400: a create request granted no supported permission. */
  permissionsEmpty: 'api_key_permissions_empty',
  /** 409: the account already holds API_KEY_MAX_PER_ACCOUNT keys. */
  limitReached: 'api_key_limit_reached',
} as const;
export type ApiKeyErrorCode = (typeof API_KEY_ERROR_CODES)[keyof typeof API_KEY_ERROR_CODES];

function maskForPreset(presetId: ApiKeyPresetId): number {
  switch (presetId) {
    case 'read_only':
      return CRUD_BITS.read;
    case 'full_access':
      return CRUD_MASK_ALL;
    default: {
      const unexpected: never = presetId;
      throw new Error(`Unknown API key preset: ${String(unexpected)}`);
    }
  }
}

function sameApiKeyPermissions(left: ApiKeyPermissions, right: ApiKeyPermissions): boolean {
  for (const resource of API_KEY_RESOURCES) {
    if (left[resource] !== right[resource]) {
      return false;
    }
  }
  return true;
}
