import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  EMBED_CONTROLS_OVERLAY_HEIGHT_PX,
  EMBED_LIST_ROW_HEIGHT_PX,
  EMBED_LIST_ROW_INNER_GAP_PX,
  EMBED_LIST_ROW_PADDING_BLOCK_PX,
  EMBED_LIST_ROW_TITLE_FONT_SIZE_PX,
  EMBED_LIST_VIDEO_PLACEHOLDER_PX,
  EMBED_LIST_VIDEO_REFERENCE_WIDTH_PX,
  EMBED_LIST_VISIBLE_ROWS_DEFAULT,
  EMBED_META_LINE_MIN_HEIGHT_PX,
  EMBED_PLAY_BUTTON_SIZE_PX,
  EMBED_PLAY_BUTTON_SIZE_REM,
  EMBED_PLAYER_ART_SIZE_PX,
  EMBED_PLAYER_INFO_CONTROLS_GAP_PX,
  EMBED_PRESENTATION_SELECTOR_HEIGHT_PX,
  EMBED_ROOT_FONT_SIZE_PX,
  EMBED_SEGMENT_INFO_BAR_HEIGHT_PX,
  EMBED_SINGLE_VIDEO_PLACEHOLDER_PX,
  EMBED_TEXT_LINE_HEIGHT,
} from '../embedLayoutTokens';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const embedLayoutTokensScssPath = path.resolve(
  testDir,
  '../../../styles/components/embed/_embedLayoutTokens.scss'
);

type ScssTokenMap = Record<string, number>;

function parsePxValue(rawValue: string): number | null {
  const trimmed = rawValue.trim();

  if (trimmed.endsWith('px')) {
    return Number.parseInt(trimmed, 10);
  }

  if (trimmed.endsWith('rem')) {
    const rem = Number.parseFloat(trimmed);
    return Math.round(rem * EMBED_ROOT_FONT_SIZE_PX);
  }

  const asNumber = Number.parseFloat(trimmed);
  if (!Number.isNaN(asNumber) && /^-?\d+(\.\d+)?$/.test(trimmed)) {
    return asNumber;
  }

  return null;
}

function parseEmbedLayoutTokensScss(source: string): ScssTokenMap {
  const tokens: ScssTokenMap = {};
  const variablePattern = /\$([a-z0-9-]+):\s*([^;]+);/g;

  for (const match of source.matchAll(variablePattern)) {
    const variableName = match[1];
    const rawValue = match[2];

    if (variableName !== undefined && rawValue !== undefined) {
      const parsedValue = parsePxValue(rawValue);
      if (parsedValue !== null) {
        tokens[variableName] = parsedValue;
      }
    }
  }

  return tokens;
}

describe('embedLayoutTokens SCSS sync', () => {
  it('derives list row height from row layout literals', () => {
    expect(EMBED_LIST_ROW_HEIGHT_PX).toBe(
      EMBED_LIST_ROW_PADDING_BLOCK_PX * 2 +
        Math.round(EMBED_LIST_ROW_TITLE_FONT_SIZE_PX * EMBED_TEXT_LINE_HEIGHT) +
        EMBED_LIST_ROW_INNER_GAP_PX +
        EMBED_META_LINE_MIN_HEIGHT_PX
    );
  });

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
    expect(scssTokens['embed-list-video-reference-width']).toBe(
      EMBED_LIST_VIDEO_REFERENCE_WIDTH_PX
    );
    expect(scssTokens['embed-list-row-height']).toBe(EMBED_LIST_ROW_HEIGHT_PX);
    expect(scssTokens['embed-list-visible-rows-default']).toBe(EMBED_LIST_VISIBLE_ROWS_DEFAULT);
    expect(scssTokens['embed-presentation-selector-height']).toBe(
      EMBED_PRESENTATION_SELECTOR_HEIGHT_PX
    );
    expect(scssTokens['embed-player-info-controls-gap']).toBe(EMBED_PLAYER_INFO_CONTROLS_GAP_PX);
    expect(scssTokens['embed-controls-overlay-height']).toBe(EMBED_CONTROLS_OVERLAY_HEIGHT_PX);
    expect(scssTokens['embed-segment-info-bar-height']).toBe(EMBED_SEGMENT_INFO_BAR_HEIGHT_PX);
  });
});
