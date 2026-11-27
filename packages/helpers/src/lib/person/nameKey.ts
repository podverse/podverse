/** Stored `person.name_key` length. Longer names keep the leading characters. */
export const PERSON_NAME_KEY_MAX_LENGTH = 255;

/**
 * Identity key for a podcast:person name.
 *
 * NFKC, trimmed, lowercased. Runs of characters that are not letters or numbers become one
 * hyphen, and hyphens at the ends are dropped. An empty result is not a person. The SQL
 * backfill `person_name_key` uses the same steps with POSIX alnum, so a later parse can
 * relink a name the database locale treated differently.
 */
export function personNameKey(raw: string): string | null {
  const hyphenated = raw
    .normalize('NFKC')
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/gu, '');
  if (hyphenated === '') {
    return null;
  }
  const bounded =
    hyphenated.length > PERSON_NAME_KEY_MAX_LENGTH
      ? hyphenated.slice(0, PERSON_NAME_KEY_MAX_LENGTH).replace(/-+$/gu, '')
      : hyphenated;
  return bounded === '' ? null : bounded;
}
