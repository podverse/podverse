import { afterEach, describe, expect, it } from 'vitest';

import { resolveEmbedConnectionQualityTarget } from '../resolveEmbedConnectionQualityTarget';

type ConnectionStub = {
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  saveData?: boolean;
};

function setConnection(connection: ConnectionStub | undefined): void {
  Object.defineProperty(navigator, 'connection', {
    configurable: true,
    value: connection,
  });
}

afterEach(() => {
  setConnection(undefined);
});

describe('resolveEmbedConnectionQualityTarget', () => {
  it('returns the balanced default when no connection info is available', () => {
    setConnection(undefined);
    expect(resolveEmbedConnectionQualityTarget()).toEqual({
      audioMaxKbps: 128,
      videoMaxHeight: 720,
    });
  });

  it('returns the balanced default on a fast (4g) connection', () => {
    setConnection({ effectiveType: '4g' });
    expect(resolveEmbedConnectionQualityTarget()).toEqual({
      audioMaxKbps: 128,
      videoMaxHeight: 720,
    });
  });

  it('returns a moderate target on 3g', () => {
    setConnection({ effectiveType: '3g' });
    expect(resolveEmbedConnectionQualityTarget()).toEqual({
      audioMaxKbps: 96,
      videoMaxHeight: 480,
    });
  });

  it('returns a constrained target on slow connections', () => {
    setConnection({ effectiveType: '2g' });
    expect(resolveEmbedConnectionQualityTarget()).toEqual({
      audioMaxKbps: 64,
      videoMaxHeight: 360,
    });
  });

  it('honors the Data Saver preference even on a fast connection', () => {
    setConnection({ effectiveType: '4g', saveData: true });
    expect(resolveEmbedConnectionQualityTarget()).toEqual({
      audioMaxKbps: 64,
      videoMaxHeight: 360,
    });
  });
});
