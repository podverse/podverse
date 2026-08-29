/**
 * Narrowing a list of titles by what a user typed.
 *
 * Distinct from `createSortableTitle`, which squashes a title down to letters and digits to make a
 * stable sort key. That form is wrong for filtering: it removes the spaces and punctuation the user
 * is still typing, so "daily show" would fail against a key reading `dailyshow`. Here the title
 * keeps its shape and only its case and leading article are set aside.
 *
 * Web and mobile both narrow subscription lists this way. Two implementations would be two answers
 * to the same question, and the surface a user happens to be holding would decide which shows they
 * can find.
 */

const LEADING_ARTICLE = /^(the|a|an)\s+/;

/** Lowercased and trimmed — the form both ordering and filtering compare against. */
export const normalizeTitle = (title: string): string => {
  return title.trim().toLowerCase();
};

/** `normalizeTitle` with a leading article removed, so "The Daily" files under D. */
export const articleStrippedTitle = (title: string): string => {
  return normalizeTitle(title).replace(LEADING_ARTICLE, '');
};

/**
 * Does a title match what the user typed into a subscription filter?
 *
 * Case-insensitive substring against the title as written and against it without a leading article —
 * the same pair the ordering uses, so a list that files "The Daily" under D also answers to being
 * filtered that way.
 *
 * Title only. Matching descriptions would return shows whose name has nothing to do with the term,
 * leaving the user looking at a row and unable to see why it is there.
 *
 * An empty term matches everything, so callers can pass raw input without guarding first.
 */
export const matchesTitleFilter = (title: string, term: string): boolean => {
  const needle = normalizeTitle(term);
  if (needle.length === 0) {
    return true;
  }

  return normalizeTitle(title).includes(needle) || articleStrippedTitle(title).includes(needle);
};
