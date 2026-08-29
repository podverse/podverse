/**
 * The Home filter term, held for the life of the process.
 *
 * Deliberately not in device prefs, unlike the All / Add-by-RSS chip beside it. A term restored on
 * launch hides most of the list, and a user who does not remember typing it reads that as their
 * subscriptions having gone missing rather than as a setting being honoured.
 *
 * Module scope rather than component state so the term outlives a remount — switching tabs, opening
 * a podcast and coming back, changing locale — and dies with the process.
 */
let filterTerm = '';

export const readHomeFilterTerm = (): string => {
  return filterTerm;
};

export const writeHomeFilterTerm = (term: string): void => {
  filterTerm = term;
};
