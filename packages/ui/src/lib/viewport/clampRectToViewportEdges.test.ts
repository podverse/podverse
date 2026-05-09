import { describe, expect, it } from 'vitest';

import { clampRectToViewportEdges } from './clampRectToViewportEdges';

describe('clampRectToViewportEdges', () => {
  const margin = 8;

  it('returns zero delta when rect is fully inside the padded viewport', () => {
    const rect = { left: 100, top: 50, width: 120, height: 40 };
    expect(clampRectToViewportEdges(rect, 400, 800, margin)).toEqual({ dx: 0, dy: 0 });
  });

  it('shifts right when the rect overflows the left edge', () => {
    const rect = { left: -40, top: 50, width: 120, height: 40 };
    expect(clampRectToViewportEdges(rect, 400, 800, margin)).toEqual({ dx: 48, dy: 0 });
  });

  it('shifts left when the rect overflows the right edge', () => {
    const rect = { left: 360, top: 50, width: 120, height: 40 };
    expect(clampRectToViewportEdges(rect, 400, 800, margin)).toEqual({ dx: -88, dy: 0 });
  });

  it('pins left when the rect is wider than the usable width', () => {
    const rect = { left: 0, top: 50, width: 500, height: 40 };
    expect(clampRectToViewportEdges(rect, 400, 800, margin)).toEqual({ dx: 8, dy: 0 });
  });

  it('shifts down when the rect overflows the top edge', () => {
    const rect = { left: 50, top: -10, width: 100, height: 40 };
    expect(clampRectToViewportEdges(rect, 400, 800, margin)).toEqual({ dx: 0, dy: 18 });
  });

  it('shifts up when the rect overflows the bottom edge', () => {
    const rect = { left: 50, top: 780, width: 100, height: 40 };
    expect(clampRectToViewportEdges(rect, 400, 800, margin)).toEqual({ dx: 0, dy: -28 });
  });

  it('pins top when the rect is taller than the usable height', () => {
    const rect = { left: 50, top: 100, width: 100, height: 900 };
    expect(clampRectToViewportEdges(rect, 400, 800, margin)).toEqual({ dx: 0, dy: -92 });
  });
});
