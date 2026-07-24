import { describe, expect, it } from 'vitest';

import {
  serializeAnimateVideoSurfaceCommand,
  serializeAttachVideoSurfaceCommand,
  serializeLoadCommand,
} from './bridgeCommandSerialization';

describe('serializeLoadCommand', () => {
  it('returns a single-element tuple when no initial seek is provided', () => {
    expect(serializeLoadCommand({ url: 'https://example.com/a.mp3' })).toEqual([
      'https://example.com/a.mp3',
    ]);
  });

  it('includes initialSeekSeconds when provided', () => {
    expect(
      serializeLoadCommand({ initialSeekSeconds: 12.5, url: 'https://example.com/a.mp3' })
    ).toEqual(['https://example.com/a.mp3', 12.5]);
  });

  it('allows an initial seek of 0', () => {
    expect(serializeLoadCommand({ initialSeekSeconds: 0, url: 'file:///tmp/a.mp3' })).toEqual([
      'file:///tmp/a.mp3',
      0,
    ]);
  });

  it('trims surrounding whitespace from the url', () => {
    expect(serializeLoadCommand({ url: '  https://example.com/a.mp3  ' })).toEqual([
      'https://example.com/a.mp3',
    ]);
  });

  it('throws when the url is empty or whitespace', () => {
    expect(() => serializeLoadCommand({ url: '' })).toThrow(/url/);
    expect(() => serializeLoadCommand({ url: '   ' })).toThrow(/url/);
  });

  it('throws when initialSeekSeconds is negative or not finite', () => {
    expect(() => serializeLoadCommand({ initialSeekSeconds: -1, url: 'x' })).toThrow(
      /initialSeekSeconds/
    );
    expect(() => serializeLoadCommand({ initialSeekSeconds: Number.NaN, url: 'x' })).toThrow(
      /initialSeekSeconds/
    );
    expect(() =>
      serializeLoadCommand({ initialSeekSeconds: Number.POSITIVE_INFINITY, url: 'x' })
    ).toThrow(/initialSeekSeconds/);
  });
});

describe('serializeAttachVideoSurfaceCommand', () => {
  it('serializes a rect in stable positional order with cornerRadius defaulting to 0', () => {
    expect(
      serializeAttachVideoSurfaceCommand('mini', { height: 40, width: 40, x: 10, y: 20 })
    ).toEqual(['mini', 10, 20, 40, 40, 0]);
  });

  it('passes through an explicit cornerRadius', () => {
    expect(
      serializeAttachVideoSurfaceCommand('full', {
        cornerRadius: 8,
        height: 200,
        width: 300,
        x: 0,
        y: 0,
      })
    ).toEqual(['full', 0, 0, 300, 200, 8]);
  });

  it('allows negative x/y (off-screen positioning)', () => {
    expect(
      serializeAttachVideoSurfaceCommand('mini', { height: 10, width: 10, x: -5, y: -5 })
    ).toEqual(['mini', -5, -5, 10, 10, 0]);
  });

  it('throws on non-finite x/y', () => {
    expect(() =>
      serializeAttachVideoSurfaceCommand('mini', { height: 10, width: 10, x: Number.NaN, y: 0 })
    ).toThrow(/x/);
  });

  it('throws on negative or non-finite width/height', () => {
    expect(() =>
      serializeAttachVideoSurfaceCommand('mini', { height: 10, width: -1, x: 0, y: 0 })
    ).toThrow(/width/);
    expect(() =>
      serializeAttachVideoSurfaceCommand('mini', {
        height: Number.POSITIVE_INFINITY,
        width: 10,
        x: 0,
        y: 0,
      })
    ).toThrow(/height/);
  });

  it('throws on a negative cornerRadius', () => {
    expect(() =>
      serializeAttachVideoSurfaceCommand('full', {
        cornerRadius: -2,
        height: 10,
        width: 10,
        x: 0,
        y: 0,
      })
    ).toThrow(/cornerRadius/);
  });
});

describe('serializeAnimateVideoSurfaceCommand', () => {
  it('serializes target and duration in order', () => {
    expect(serializeAnimateVideoSurfaceCommand('full', 250)).toEqual(['full', 250]);
  });

  it('allows a duration of 0 (snap without animation)', () => {
    expect(serializeAnimateVideoSurfaceCommand('mini', 0)).toEqual(['mini', 0]);
  });

  it('throws on negative or non-finite duration', () => {
    expect(() => serializeAnimateVideoSurfaceCommand('mini', -1)).toThrow(/durationMs/);
    expect(() => serializeAnimateVideoSurfaceCommand('mini', Number.NaN)).toThrow(/durationMs/);
  });
});
