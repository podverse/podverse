/**
 * Place the Boosts chip immediately before `before` when this screen can show the public list.
 * A screen whose anchor chip is absent keeps Boosts at the end of the row.
 */
export const insertBoostsChip = <T extends string>(
  tabs: readonly T[],
  hasBoosts: boolean,
  before: T
): (T | 'boosts')[] => {
  if (!hasBoosts) {
    return [...tabs];
  }
  const index = tabs.indexOf(before);
  if (index < 0) {
    return [...tabs, 'boosts'];
  }
  return [...tabs.slice(0, index), 'boosts', ...tabs.slice(index)];
};
