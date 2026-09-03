export type FlatReorderItem = {
  index: number;
  key: string;
  sectionId: string;
};

export type SlotLayout = {
  height: number;
  y: number;
};

export type SectionBounds = {
  height: number;
  sectionId: string;
  y: number;
};

export type HoverTarget = {
  flatIndex: number;
  sectionId: string;
  toIndex: number;
};

export function flattenReorderSections<T>(
  sections: readonly { id: string; items: readonly T[] }[],
  keyExtractor: (item: T) => string
): FlatReorderItem[] {
  return sections.flatMap((section) =>
    section.items.map((item, index) => ({
      index,
      key: keyExtractor(item),
      sectionId: section.id,
    }))
  );
}

const sectionAtY = (sections: readonly SectionBounds[], fingerY: number): string | null => {
  let match: string | null = null;
  for (const section of sections) {
    if (fingerY >= section.y && fingerY <= section.y + section.height) {
      match = section.sectionId;
    }
  }
  return match;
};

const insertionAmong = (
  items: readonly FlatReorderItem[],
  layouts: Readonly<Record<string, SlotLayout>>,
  fingerY: number
): number => {
  let insert = 0;
  for (const item of items) {
    const layout = layouts[item.key];
    if (layout === undefined) {
      continue;
    }
    if (fingerY >= layout.y + layout.height / 2) {
      insert += 1;
    }
  }
  return insert;
};

/**
 * Maps a finger Y (window coordinates) to a drop target. `toIndex` is the insertion index in the
 * destination section after the dragged item is removed from its source. `flatIndex` is the
 * destination index in the current flattened list (dragged item still occupying its slot) and is
 * used to shift siblings while dragging.
 */
export function resolveHover(
  items: readonly FlatReorderItem[],
  layouts: Readonly<Record<string, SlotLayout>>,
  sections: readonly SectionBounds[],
  draggedKey: string,
  fingerY: number
): HoverTarget | null {
  const dragged = items.find((item) => item.key === draggedKey);
  if (dragged === undefined) {
    return null;
  }

  const sectionId = sectionAtY(sections, fingerY) ?? dragged.sectionId;
  const othersInSection = items.filter(
    (item) => item.sectionId === sectionId && item.key !== draggedKey
  );
  const others = items.filter((item) => item.key !== draggedKey);

  return {
    flatIndex: insertionAmong(others, layouts, fingerY),
    sectionId,
    toIndex: insertionAmong(othersInSection, layouts, fingerY),
  };
}

export function computeItemShift(
  itemFlatIndex: number,
  fromFlatIndex: number,
  hoverFlatIndex: number,
  draggedHeight: number
): number {
  if (itemFlatIndex === fromFlatIndex) {
    return 0;
  }
  if (fromFlatIndex < hoverFlatIndex) {
    if (itemFlatIndex > fromFlatIndex && itemFlatIndex <= hoverFlatIndex) {
      return -draggedHeight;
    }
    return 0;
  }
  if (fromFlatIndex > hoverFlatIndex) {
    if (itemFlatIndex >= hoverFlatIndex && itemFlatIndex < fromFlatIndex) {
      return draggedHeight;
    }
  }
  return 0;
}
