/**
 * The shared half of remembered list preferences: how a screen is identified, and what may be
 * stored against it.
 *
 * Web and mobile keep the preferences themselves in different places — a cookie the server can read
 * during rendering, and AsyncStorage — but they must agree on the key, or the same podcast opened on
 * a phone and a laptop would be two different screens as far as the store is concerned. Key
 * derivation therefore lives here rather than in either app.
 */

/**
 * Which screen a preference belongs to.
 *
 * A global list has exactly one instance, so its name is the whole scope. A detail screen has one
 * per entity, which is what lets a user keep one sort for one podcast and a different sort for
 * another.
 */
export type SortPrefScope =
  | { kind: 'list'; name: string }
  | { kind: 'channel'; idText: string }
  | { kind: 'item'; idText: string }
  | { kind: 'playlist'; idText: string };

/**
 * The structured selections a screen may remember.
 *
 * Every field is a short enumerated token chosen from a control, never free input. That is the whole
 * reason the shape is closed: a text filter restored on launch hides most of the list and reads as
 * missing data rather than as a remembered preference, and an open record would let one screen store
 * one without anyone noticing.
 */
export type SortPrefValue = {
  category?: string;
  filter?: string;
  mediaType?: string;
  range?: string;
  sort?: string;
  tab?: string;
  type?: string;
  viewMode?: string;
};

const SORT_PREF_FIELDS = [
  'category',
  'filter',
  'mediaType',
  'range',
  'sort',
  'tab',
  'type',
  'viewMode',
] as const;

/**
 * A token longer than this did not come from a control. Storing it anyway is how free text reaches a
 * store that promises not to hold any.
 */
const MAX_TOKEN_LENGTH = 64;

const toToken = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0 || trimmed.length > MAX_TOKEN_LENGTH) {
    return null;
  }
  return trimmed;
};

/**
 * The storage key for a scope, or `null` when the scope carries no usable identifier.
 *
 * Callers treat `null` as "do not remember anything for this screen" and fall back to the documented
 * default. An empty identifier would otherwise produce `channel:`, a single bucket every unidentified
 * channel shares, which is worse than not remembering at all.
 */
export const buildSortPrefScopeKey = (scope: SortPrefScope): string | null => {
  if (scope.kind === 'list') {
    const name = toToken(scope.name);
    return name === null ? null : name;
  }

  const idText = toToken(scope.idText);
  return idText === null ? null : `${scope.kind}:${idText}`;
};

/**
 * Read an untrusted stored payload as a preference, keeping only recognised fields with usable
 * tokens.
 *
 * Storage outlives the code that wrote it. A preference written by an older build, hand-edited, or
 * corrupted has to degrade to "no preference" rather than propagate an unusable value into a data
 * read, so anything unrecognised is dropped rather than repaired.
 */
export const sanitizeSortPrefValue = (value: unknown): SortPrefValue | null => {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return null;
  }

  const source: Record<string, unknown> = { ...value };
  const sanitized: SortPrefValue = {};
  let hasField = false;

  for (const field of SORT_PREF_FIELDS) {
    const token = toToken(source[field]);
    if (token !== null) {
      sanitized[field] = token;
      hasField = true;
    }
  }

  return hasField ? sanitized : null;
};

/**
 * A stored token, or the default when it is missing or not one this build offers.
 *
 * Storage outlives the code that wrote it, so a value from an older build — or one hand-edited in a
 * cookie — has to read as "no preference" rather than reach a query. Falling back is silent on
 * purpose: the screen has a documented default and the next selection overwrites the entry.
 */
export const pickSortPrefToken = <T extends string>(
  stored: string | undefined,
  allowed: readonly T[],
  fallback: T
): T => {
  if (stored === undefined) {
    return fallback;
  }
  return allowed.find((option) => option === stored) ?? fallback;
};

/**
 * Fold a change into an existing preference.
 *
 * Screens write one control at a time — a sort here, a scope chip there — so a write has to leave
 * the fields it says nothing about alone. Passing `undefined` for a field clears it, which is how a
 * control returning to its default stops being remembered.
 */
export const mergeSortPrefValue = (
  current: SortPrefValue | null,
  patch: SortPrefValue
): SortPrefValue | null => {
  return sanitizeSortPrefValue({ ...current, ...patch });
};
