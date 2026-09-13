/**
 * Put the selected chip first so the row can scroll to the start and keep that chip on screen.
 *
 * Sort and category stay in the leading slot; this only reorders the section / media-type chips.
 */
export const placeSelectedFirst = <T extends { key: string }>(
  items: readonly T[],
  selectedKey: string | null
): T[] => {
  if (selectedKey === null) {
    return [...items];
  }

  const selectedIndex = items.findIndex((item) => item.key === selectedKey);
  if (selectedIndex <= 0) {
    return [...items];
  }

  const selected = items[selectedIndex];
  if (selected === undefined) {
    return [...items];
  }

  return [selected, ...items.slice(0, selectedIndex), ...items.slice(selectedIndex + 1)];
};
