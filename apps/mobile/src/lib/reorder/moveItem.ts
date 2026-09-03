/**
 * Move `fromIndex` to `toIndex` in a new array. `toIndex` is the insertion index after the item
 * is removed (0..length-1 inclusive, where length-1 is the end).
 */
export function moveItem<T>(list: readonly T[], fromIndex: number, toIndex: number): T[] {
  if (fromIndex < 0 || fromIndex >= list.length) {
    return [...list];
  }

  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  if (item === undefined) {
    return [...list];
  }

  const clamped = Math.min(Math.max(toIndex, 0), next.length);
  next.splice(clamped, 0, item);
  return next;
}
