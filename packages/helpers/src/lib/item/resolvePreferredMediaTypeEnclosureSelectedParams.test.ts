import { describe, expect, it } from 'vitest';

import type { DTOItemEnclosure } from '../../dtos/item/itemEnclosure.js';
import type { LabeledItemEnclosure } from './itemEnclosure.js';
import { resolvePreferredMediaTypeEnclosureSelectedParams } from './itemEnclosure.js';

function buildEnclosure(overrides: Partial<DTOItemEnclosure> = {}): DTOItemEnclosure {
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

function labeled(mediaType: 'audio' | 'video'): LabeledItemEnclosure {
  return {
    enclosure: buildEnclosure({ type: mediaType === 'video' ? 'video/mp4' : 'audio/mpeg' }),
    mediaType,
    label: mediaType,
  };
}

describe('resolvePreferredMediaTypeEnclosureSelectedParams', () => {
  it('returns the default selection when there are no enclosures', () => {
    expect(resolvePreferredMediaTypeEnclosureSelectedParams([], 'video')).toEqual({
      type: 'default',
      enclosureRowSelected: null,
      sourceRowSelected: null,
    });
  });

  it('prefers video when video is preferred and available', () => {
    const result = resolvePreferredMediaTypeEnclosureSelectedParams(
      [labeled('audio'), labeled('video')],
      'video'
    );
    expect(result).toEqual({ type: 'video', enclosureRowSelected: 0, sourceRowSelected: 0 });
  });

  it('prefers audio when audio is preferred and available', () => {
    const result = resolvePreferredMediaTypeEnclosureSelectedParams(
      [labeled('audio'), labeled('video')],
      'audio'
    );
    expect(result).toEqual({ type: 'audio', enclosureRowSelected: 0, sourceRowSelected: 0 });
  });

  it('falls back to audio when video is preferred but only audio exists', () => {
    const result = resolvePreferredMediaTypeEnclosureSelectedParams([labeled('audio')], 'video');
    expect(result).toEqual({ type: 'audio', enclosureRowSelected: 0, sourceRowSelected: 0 });
  });

  it('falls back to video when audio is preferred but only video exists', () => {
    const result = resolvePreferredMediaTypeEnclosureSelectedParams([labeled('video')], 'audio');
    expect(result).toEqual({ type: 'video', enclosureRowSelected: 0, sourceRowSelected: 0 });
  });

  it('uses the within-type pick callback when provided', () => {
    const result = resolvePreferredMediaTypeEnclosureSelectedParams(
      [labeled('video'), labeled('video'), labeled('video')],
      'video',
      () => 2
    );
    expect(result).toEqual({ type: 'video', enclosureRowSelected: 2, sourceRowSelected: 0 });
  });
});
