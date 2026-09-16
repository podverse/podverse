import { describe, expect, it } from 'vitest';

import {
  isEngineBufferingState,
  isEnginePlayableState,
  playbackTransportForEngineState,
} from './playbackTransport';

describe('playbackTransportForEngineState', () => {
  it('spins only while the source cannot start yet', () => {
    expect(playbackTransportForEngineState('loading', false)).toBe('loading');
    expect(playbackTransportForEngineState('stalled', false)).toBe('loading');
  });

  it('keeps the play/pause glyph when a playable source re-buffers', () => {
    expect(playbackTransportForEngineState('loading', true)).toBeNull();
    expect(playbackTransportForEngineState('stalled', true)).toBeNull();
  });

  it('maps engine error to the retryable state', () => {
    expect(playbackTransportForEngineState('error', false)).toBe('error');
    expect(playbackTransportForEngineState('error', true)).toBe('error');
  });

  it('maps playing, and settles ready / paused / ended to paused', () => {
    expect(playbackTransportForEngineState('playing', true)).toBe('playing');
    expect(playbackTransportForEngineState('ready', true)).toBe('paused');
    expect(playbackTransportForEngineState('paused', true)).toBe('paused');
    expect(playbackTransportForEngineState('ended', true)).toBe('paused');
  });

  it('leaves the glyph alone for idle', () => {
    expect(playbackTransportForEngineState('idle', false)).toBeNull();
  });
});

describe('engine state predicates', () => {
  it('treats loading and stalled as buffering', () => {
    expect(isEngineBufferingState('loading')).toBe(true);
    expect(isEngineBufferingState('stalled')).toBe(true);
    expect(isEngineBufferingState('playing')).toBe(false);
  });

  it('treats ready onward as playable', () => {
    expect(isEnginePlayableState('ready')).toBe(true);
    expect(isEnginePlayableState('playing')).toBe(true);
    expect(isEnginePlayableState('paused')).toBe(true);
    expect(isEnginePlayableState('ended')).toBe(true);
    expect(isEnginePlayableState('idle')).toBe(false);
    expect(isEnginePlayableState('loading')).toBe(false);
  });
});
