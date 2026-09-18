import { describe, expect, it } from 'vitest';

import type { DTOItemEnclosure } from '@podverse/helpers/dto';
import type { EnclosureSelectedParams } from '@podverse/helpers/item/itemEnclosure';
import { buildLabeledItemEnclosures } from '@podverse/helpers/item/itemEnclosure';

import {
  DEFAULT_ENCLOSURE_SELECTED_PARAMS,
  isFreshEnclosureSelectedParams,
  resolveItemEnclosureUrl,
  resolveSelectedItemEnclosureMediaType,
  resolveSessionEnclosureSelectedParams,
} from './resolveEnclosureUrl';

const enclosure = (params: {
  id: number;
  uri: string;
  type: string;
  item_enclosure_default?: boolean;
  height?: number | null;
}): DTOItemEnclosure => ({
  id: params.id,
  item_id: 1,
  type: params.type,
  height: params.height ?? null,
  item_enclosure_default: params.item_enclosure_default ?? false,
  item_enclosure_integrity: null,
  item_enclosure_sources: [
    {
      id: params.id,
      item_enclosure_id: params.id,
      uri: params.uri,
    },
  ],
});

describe('resolveEnclosureUrl', () => {
  it('recognizes a fresh default enclosure selection', () => {
    expect(isFreshEnclosureSelectedParams(DEFAULT_ENCLOSURE_SELECTED_PARAMS)).toBe(true);
    expect(
      isFreshEnclosureSelectedParams({
        enclosureRowSelected: 0,
        sourceRowSelected: 0,
        type: 'video',
      })
    ).toBe(false);
  });

  it('seeds selection from preferred media type on fresh default', () => {
    const labeled = buildLabeledItemEnclosures([
      enclosure({
        id: 1,
        uri: 'https://cdn.example.com/audio.mp3',
        type: 'audio/mpeg',
      }),
      enclosure({
        id: 2,
        uri: 'https://cdn.example.com/video.mp4',
        type: 'video/mp4',
        height: 720,
      }),
    ]);

    const next = resolveSessionEnclosureSelectedParams({
      current: DEFAULT_ENCLOSURE_SELECTED_PARAMS,
      labeledItemEnclosures: labeled,
      preferredMediaType: 'video',
    });

    expect(next).toEqual({
      enclosureRowSelected: 0,
      sourceRowSelected: 0,
      type: 'video',
    });
  });

  it('keeps existing non-default selection params', () => {
    const current: EnclosureSelectedParams = {
      enclosureRowSelected: 1,
      sourceRowSelected: 0,
      type: 'audio',
    };

    const next = resolveSessionEnclosureSelectedParams({
      current,
      labeledItemEnclosures: [],
      preferredMediaType: 'video',
    });

    expect(next).toEqual(current);
  });

  it('falls back to default enclosure when selected media type is unavailable', () => {
    const labeled = buildLabeledItemEnclosures([
      enclosure({
        id: 1,
        uri: 'https://cdn.example.com/default-audio.mp3',
        type: 'audio/mpeg',
        item_enclosure_default: true,
      }),
    ]);

    const selected = resolveItemEnclosureUrl({
      labeledItemEnclosures: labeled,
      selectedParams: {
        enclosureRowSelected: 0,
        sourceRowSelected: 0,
        type: 'video',
      },
    });

    expect(selected).toBe('https://cdn.example.com/default-audio.mp3');
  });

  it('resolves selected media type as video for podcast video alternate', () => {
    const labeled = buildLabeledItemEnclosures([
      enclosure({
        id: 1,
        uri: 'https://cdn.example.com/audio.mp3',
        type: 'audio/mpeg',
        item_enclosure_default: true,
      }),
      enclosure({
        id: 2,
        uri: 'https://cdn.example.com/video.mp4',
        type: 'video/mp4',
        height: 720,
      }),
    ]);

    const selectedParams = resolveSessionEnclosureSelectedParams({
      current: DEFAULT_ENCLOSURE_SELECTED_PARAMS,
      labeledItemEnclosures: labeled,
      preferredMediaType: 'video',
    });

    expect(
      resolveSelectedItemEnclosureMediaType({
        labeledItemEnclosures: labeled,
        selectedParams,
      })
    ).toBe('video');
  });

  it('resolves selected media type as audio for preferred-audio selection', () => {
    const labeled = buildLabeledItemEnclosures([
      enclosure({
        id: 1,
        uri: 'https://cdn.example.com/audio.mp3',
        type: 'audio/mpeg',
        item_enclosure_default: true,
      }),
      enclosure({
        id: 2,
        uri: 'https://cdn.example.com/video.mp4',
        type: 'video/mp4',
        height: 720,
      }),
    ]);

    const selectedParams = resolveSessionEnclosureSelectedParams({
      current: DEFAULT_ENCLOSURE_SELECTED_PARAMS,
      labeledItemEnclosures: labeled,
      preferredMediaType: 'audio',
    });

    expect(
      resolveSelectedItemEnclosureMediaType({
        labeledItemEnclosures: labeled,
        selectedParams,
      })
    ).toBe('audio');
  });
});
