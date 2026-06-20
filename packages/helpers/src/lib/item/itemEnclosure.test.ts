import { describe, expect, it } from 'vitest';

import type { DTOItemEnclosure } from '../../dtos/item/itemEnclosure.js';
import { resolveItemEnclosureModalityIndicator } from './itemEnclosure.js';

function buildEnclosure(overrides: Partial<DTOItemEnclosure>): DTOItemEnclosure {
  return {
    id: 0,
    item_id: 0,
    type: 'audio/mpeg',
    length: null,
    bitrate: null,
    height: null,
    language: null,
    title: null,
    rel: null,
    codecs: null,
    item_enclosure_default: false,
    item_enclosure_integrity: null,
    item_enclosure_sources: [],
    ...overrides,
  };
}

const audioEnclosure = buildEnclosure({ type: 'audio/mpeg', item_enclosure_default: true });
const audioOggEnclosure = buildEnclosure({ type: 'audio/ogg' });
const videoEnclosureByType = buildEnclosure({ type: 'video/mp4' });
const videoEnclosureByHeight = buildEnclosure({ type: 'application/octet-stream', height: 720 });

describe('resolveItemEnclosureModalityIndicator', () => {
  it('returns "none" when there are no enclosures', () => {
    expect(resolveItemEnclosureModalityIndicator([])).toBe('none');
    expect(resolveItemEnclosureModalityIndicator(null)).toBe('none');
    expect(resolveItemEnclosureModalityIndicator(undefined)).toBe('none');
  });

  it('returns "none" for audio-only', () => {
    expect(resolveItemEnclosureModalityIndicator([audioEnclosure])).toBe('none');
  });

  it('returns "none" for multiple audio-only enclosures', () => {
    expect(resolveItemEnclosureModalityIndicator([audioEnclosure, audioOggEnclosure])).toBe('none');
  });

  it('returns "video" for video-only by type', () => {
    expect(resolveItemEnclosureModalityIndicator([videoEnclosureByType])).toBe('video');
  });

  it('returns "video" for video-only detected by height', () => {
    expect(resolveItemEnclosureModalityIndicator([videoEnclosureByHeight])).toBe('video');
  });

  it('returns "mixed" when both audio and video are present', () => {
    expect(resolveItemEnclosureModalityIndicator([audioEnclosure, videoEnclosureByType])).toBe(
      'mixed'
    );
  });
});
