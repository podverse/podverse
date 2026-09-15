import { describe, expect, it } from 'vitest';

import { playbackTransportFromEngineState } from './playbackTransport';

describe('playbackTransportFromEngineState', () => {
  it('maps buffering states to loading', () => {
    expect(playbackTransportFromEngineState('loading')).toBe('loading');
    expect(playbackTransportFromEngineState('stalled')).toBe('loading');
  });

  it('maps engine error to retryable error', () => {
    expect(playbackTransportFromEngineState('error')).toBe('error');
  });

  it('maps playing to playing', () => {
    expect(playbackTransportFromEngineState('playing')).toBe('playing');
  });

  it('maps idle, ready, paused, and ended to paused', () => {
    expect(playbackTransportFromEngineState('idle')).toBe('paused');
    expect(playbackTransportFromEngineState('ready')).toBe('paused');
    expect(playbackTransportFromEngineState('paused')).toBe('paused');
    expect(playbackTransportFromEngineState('ended')).toBe('paused');
  });
});
