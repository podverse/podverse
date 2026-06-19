import { describe, expect, it } from 'vitest';

import {
  DEFAULT_MODAL_VIDEO_ASPECT_RATIO,
  getVideoElementAspectRatio,
  resolveModalVideoAspectRatio,
} from './modalVideoAspectRatio';

function createVideoStub(overrides: {
  readyState?: number;
  videoWidth?: number;
  videoHeight?: number;
}): HTMLVideoElement {
  const video = document.createElement('video');
  if (overrides.readyState !== undefined) {
    Object.defineProperty(video, 'readyState', { value: overrides.readyState });
  }
  if (overrides.videoWidth !== undefined) {
    Object.defineProperty(video, 'videoWidth', { value: overrides.videoWidth });
  }
  if (overrides.videoHeight !== undefined) {
    Object.defineProperty(video, 'videoHeight', { value: overrides.videoHeight });
  }
  return video;
}

describe('getVideoElementAspectRatio', () => {
  it('returns width divided by height when metadata dimensions are available', () => {
    const video = createVideoStub({ readyState: 1, videoWidth: 1920, videoHeight: 1080 });
    expect(getVideoElementAspectRatio(video)).toBeCloseTo(16 / 9);
  });

  it('returns null when readyState has no metadata yet', () => {
    const video = createVideoStub({ readyState: 0, videoWidth: 0, videoHeight: 0 });
    expect(getVideoElementAspectRatio(video)).toBeNull();
  });

  it('returns null when videoWidth or videoHeight is zero', () => {
    const video = createVideoStub({ readyState: 1, videoWidth: 0, videoHeight: 1080 });
    expect(getVideoElementAspectRatio(video)).toBeNull();
  });
});

describe('resolveModalVideoAspectRatio', () => {
  it('returns the intrinsic ratio when dimensions are available', () => {
    const video = createVideoStub({ readyState: 1, videoWidth: 1280, videoHeight: 720 });
    expect(resolveModalVideoAspectRatio(video)).toBeCloseTo(16 / 9);
  });

  it('returns null while metadata is still loading (spinner state)', () => {
    const video = createVideoStub({ readyState: 0, videoWidth: 0, videoHeight: 0 });
    expect(resolveModalVideoAspectRatio(video)).toBeNull();
  });

  it('falls back to the default ratio once metadata loads without intrinsic dimensions', () => {
    const video = createVideoStub({ readyState: 1, videoWidth: 0, videoHeight: 0 });
    expect(resolveModalVideoAspectRatio(video)).toBe(DEFAULT_MODAL_VIDEO_ASPECT_RATIO);
  });
});
