import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  EMBED_LIST_REGION_AUDIO_PX,
  EMBED_LIST_REGION_VIDEO_PX,
  EMBED_LIST_VIDEO_PLACEHOLDER_PX,
  EMBED_PLAY_BUTTON_SIZE_PX,
  EMBED_PLAY_BUTTON_SIZE_REM,
  EMBED_PLAYER_ART_SIZE_PX,
  EMBED_ROOT_FONT_SIZE_PX,
  EMBED_SINGLE_VIDEO_PLACEHOLDER_PX,
} from '../embedLayoutTokens';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const embedLayoutTokensScssPath = path.resolve(
  testDir,
  '../../../styles/components/embed/_embedLayoutTokens.scss'
);

type ScssTokenMap = Record<string, number>;

function parsePxValue(rawValue: string): number {
  const trimmed = rawValue.trim();

  if (trimmed.endsWith('px')) {
    return Number.parseInt(trimmed, 10);
  }

  if (trimmed.endsWith('rem')) {
    const rem = Number.parseFloat(trimmed);
    return Math.round(rem * EMBED_ROOT_FONT_SIZE_PX);
  }

  throw new Error(`Unsupported SCSS unit in embed layout token: ${rawValue}`);
}

function parseEmbedLayoutTokensScss(source: string): ScssTokenMap {
  const tokens: ScssTokenMap = {};
  const variablePattern = /\$([a-z0-9-]+):\s*([^;]+);/g;

  for (const match of source.matchAll(variablePattern)) {
    const variableName = match[1];
    const rawValue = match[2];

    if (variableName !== undefined && rawValue !== undefined) {
      tokens[variableName] = parsePxValue(rawValue);
    }
  }

  return tokens;
}

describe('embedLayoutTokens SCSS sync', () => {
  it('matches iframe-height literals in _embedLayoutTokens.scss', () => {
    const scssSource = readFileSync(embedLayoutTokensScssPath, 'utf8');
    const scssTokens = parseEmbedLayoutTokensScss(scssSource);

    expect(scssTokens['embed-player-art-size']).toBe(EMBED_PLAYER_ART_SIZE_PX);
    expect(scssTokens['embed-play-button-size']).toBe(EMBED_PLAY_BUTTON_SIZE_PX);
    expect(EMBED_PLAY_BUTTON_SIZE_PX).toBe(EMBED_PLAY_BUTTON_SIZE_REM * EMBED_ROOT_FONT_SIZE_PX);
    expect(scssTokens['embed-single-video-placeholder-height']).toBe(
      EMBED_SINGLE_VIDEO_PLACEHOLDER_PX
    );
    expect(scssTokens['embed-list-video-placeholder-height']).toBe(EMBED_LIST_VIDEO_PLACEHOLDER_PX);
    expect(scssTokens['embed-list-region-audio-height']).toBe(EMBED_LIST_REGION_AUDIO_PX);
    expect(scssTokens['embed-list-region-video-height']).toBe(EMBED_LIST_REGION_VIDEO_PX);
  });
});
