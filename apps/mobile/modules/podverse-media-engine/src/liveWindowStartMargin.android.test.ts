import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { LIVE_WINDOW_START_MARGIN_SECONDS } from '@podverse/playback-core';

const engineSourcePath = resolve(
  dirname(fileURLToPath(import.meta.url)),
  '../android/src/main/java/expo/modules/podversemediaengine/PodverseAudioEngine.kt'
);

describe('Android live window start margin', () => {
  it('keeps the Android resume margin equal to the shared live window start margin', () => {
    const source = readFileSync(engineSourcePath, 'utf8');
    const match = source.match(/^\s*private const val LIVE_WINDOW_START_MARGIN_MS = ([0-9_]+)L$/m);
    expect(match).not.toBeNull();
    expect(Number(match?.[1]?.replaceAll('_', '')) / 1000).toBe(LIVE_WINDOW_START_MARGIN_SECONDS);
  });
});
