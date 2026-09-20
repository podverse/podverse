import { describe, expect, it } from 'vitest';

import {
  computeItemShift,
  flattenReorderSections,
  isSameHoverTarget,
  resolveHover,
} from './resolveHover';

const items = flattenReorderSections(
  [
    { id: 'visible', items: ['Home', 'Search', 'Browse'] },
    { id: 'overflow', items: ['Notifications'] },
  ],
  (item) => item
);

const layouts = {
  Browse: { height: 40, y: 80 },
  Home: { height: 40, y: 0 },
  Notifications: { height: 40, y: 140 },
  Search: { height: 40, y: 40 },
};

const sections = [
  { height: 120, sectionId: 'visible', y: 0 },
  { height: 80, sectionId: 'overflow', y: 120 },
];

describe('resolveHover', () => {
  it('keeps the item in place when the finger stays over its slot', () => {
    expect(resolveHover(items, layouts, sections, 'Search', 55)).toEqual({
      flatIndex: 1,
      sectionId: 'visible',
      toIndex: 1,
    });
  });

  it('inserts into the other section past the last midpoint', () => {
    expect(resolveHover(items, layouts, sections, 'Home', 165)).toEqual({
      flatIndex: 3,
      sectionId: 'overflow',
      toIndex: 1,
    });
  });

  it('uses the containing section when the finger is in empty section padding', () => {
    expect(resolveHover(items, layouts, sections, 'Home', 125)).toEqual({
      flatIndex: 2,
      sectionId: 'overflow',
      toIndex: 0,
    });
  });
});

describe('isSameHoverTarget', () => {
  it('treats matching slot fields as the same target', () => {
    const a = { flatIndex: 1, sectionId: 'visible', toIndex: 1 };
    const b = { flatIndex: 1, sectionId: 'visible', toIndex: 1 };
    expect(isSameHoverTarget(a, b)).toBe(true);
  });

  it('treats a different insertion index as a change', () => {
    expect(
      isSameHoverTarget(
        { flatIndex: 1, sectionId: 'visible', toIndex: 1 },
        { flatIndex: 2, sectionId: 'visible', toIndex: 2 }
      )
    ).toBe(false);
  });

  it('treats null pairs as equal only when both are null', () => {
    expect(isSameHoverTarget(null, null)).toBe(true);
    expect(isSameHoverTarget(null, { flatIndex: 0, sectionId: 'visible', toIndex: 0 })).toBe(
      false
    );
  });
});

describe('computeItemShift', () => {
  it('shifts items between the origin and the hover to open a gap', () => {
    expect(computeItemShift(2, 0, 2, 40)).toBe(-40);
    expect(computeItemShift(0, 2, 0, 40)).toBe(40);
    expect(computeItemShift(3, 0, 2, 40)).toBe(0);
    expect(computeItemShift(0, 0, 2, 40)).toBe(0);
  });
});
