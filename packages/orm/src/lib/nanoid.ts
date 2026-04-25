import { customAlphabet } from 'nanoid';

const ALPHABET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/** Matches Postgres `CREATE DOMAIN nano_id_v2 AS VARCHAR(15)` in app/management init SQL. */
export const NANO_ID_V2_MAX_LENGTH = 15;

/**
 * Lower bound for generated and accepted `id_text`: matches {@link generateRandomIdText}
 * (`Math.max(NANO_ID_V2_MIN_LENGTH, …)`). The DB domain does not enforce a minimum; apps/JWT do.
 */
export const NANO_ID_V2_MIN_LENGTH = 9;

const DEFAULT_NANO_ID_TEXT_LENGTH = 10;

/**
 * Valid `id_text` / JWT `id_text` for `nano_id_v2` (inclusive [NANO_ID_V2_MIN_LENGTH, NANO_ID_V2_MAX_LENGTH]).
 */
export function isValidNanoIdV2IdText(value: string): boolean {
  const len = value.length;
  return len >= NANO_ID_V2_MIN_LENGTH && len <= NANO_ID_V2_MAX_LENGTH;
}

export function generateRandomIdText(): string {
  const safeLength = Math.max(
    NANO_ID_V2_MIN_LENGTH,
    Math.min(DEFAULT_NANO_ID_TEXT_LENGTH, NANO_ID_V2_MAX_LENGTH)
  );
  const nanoid = customAlphabet(ALPHABET, safeLength);
  return nanoid();
}
