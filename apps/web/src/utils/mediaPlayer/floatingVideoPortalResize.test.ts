import { describe, expect, it } from 'vitest';

import {
  computeFloatingVideoMaxWidthForAnchor,
  computeResizeFromBottomRightAnchor,
  fitFloatingVideoToViewport,
  FLOATING_VIDEO_DEFAULT_ASPECT_RATIO,
  FLOATING_VIDEO_MIN_WIDTH_PX,
} from './floatingVideoPortalResize';

describe('floatingVideoPortalResize', () => {
  it('computes max width from anchor and viewport without an arbitrary cap', () => {
    expect(
      computeFloatingVideoMaxWidthForAnchor(1200, 900, 16 / 9, 1200, 900)
    ).toBe(1200);
    expect(computeFloatingVideoMaxWidthForAnchor(1200, 900, 16 / 9, 500, 900)).toBe(500);
    expect(computeFloatingVideoMaxWidthForAnchor(600, 400, 16 / 9, 1200, 900)).toBe(600);
  });

  it('preserves aspect ratio when resizing from bottom-right anchor', () => {
    const aspectRatio = 16 / 9;
    const anchorRight = 1200;
    const anchorBottom = 900;
    const result = computeResizeFromBottomRightAnchor(
      anchorRight,
      anchorBottom,
      900,
      aspectRatio,
      1200,
      900
    );

    expect(result.size.width).toBe(300);
    expect(result.size.height).toBeCloseTo(300 / aspectRatio, 5);
    expect(result.position.left).toBe(anchorRight - result.size.width);
    expect(result.position.top).toBe(anchorBottom - result.size.height);
  });

  it('clamps width to minimum when above the floor', () => {
    const result = computeResizeFromBottomRightAnchor(1200, 900, 1150, 16 / 9, 1200, 900);
    expect(result.size.width).toBe(FLOATING_VIDEO_MIN_WIDTH_PX);
  });

  it('allows resize up to the viewport width', () => {
    const result = computeResizeFromBottomRightAnchor(1200, 900, 0, 16 / 9, 1200, 900);
    // Width caps at viewport (1200); height follows aspect ratio and the bottom-right anchor.
    expect(result.size.width).toBe(1200);
    expect(result.size.height).toBeCloseTo(1200 / (16 / 9), 5);
    expect(result.position.left).toBe(0);
    expect(result.position.top).toBeCloseTo(900 - 1200 / (16 / 9), 5);
  });

  it('shrinks proportionally to fit when the viewport is smaller than the current size', () => {
    const aspectRatio = 16 / 9;
    const result = fitFloatingVideoToViewport(
      { width: 900, height: 900 / aspectRatio },
      { left: 100, top: 50 },
      aspectRatio,
      800,
      600
    );

    expect(result.size.width).toBeLessThanOrEqual(800);
    expect(result.size.height).toBeLessThanOrEqual(600);
    expect(result.position.left).toBeGreaterThanOrEqual(0);
    expect(result.position.top).toBeGreaterThanOrEqual(0);
    expect(result.position.left + result.size.width).toBeLessThanOrEqual(800);
    expect(result.position.top + result.size.height).toBeLessThanOrEqual(600);
    expect(result.size.width / result.size.height).toBeCloseTo(aspectRatio, 5);
  });

  it('falls back to 16:9 when no video metadata is available', () => {
    expect(FLOATING_VIDEO_DEFAULT_ASPECT_RATIO).toBeCloseTo(16 / 9, 5);
  });
});
