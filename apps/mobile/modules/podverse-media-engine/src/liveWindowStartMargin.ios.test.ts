import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { LIVE_WINDOW_START_MARGIN_SECONDS } from '@podverse/playback-core';

const engineSourcePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../ios/PodverseAudioEngine.swift'
);

describe('iOS live window start margin', () => {
  it('keeps the iOS resume margin equal to the shared live window start margin', () => {
    const source = readFileSync(engineSourcePath, 'utf8');
    const match = source.match(
      /^\s*private static let liveWindowStartMarginSeconds: Double = ([0-9.]+)$/m
    );
    expect(match).not.toBeNull();
    expect(Number(match?.[1])).toBe(LIVE_WINDOW_START_MARGIN_SECONDS);
  });
});
