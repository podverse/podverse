import { describe, expect, it } from 'vitest';

import type { LabeledItemEnclosure } from '@podverse/helpers';

import { buildEmbedEnclosureSelectionParams } from '../setEmbedEnclosureSelection';

function labeled(type: string, mediaType: 'audio' | 'video', id: number): LabeledItemEnclosure {
  return {
    enclosure: {
      id,
      item_id: 1,
      type,
      item_enclosure_default: type === 'audio/mpeg',
      item_enclosure_integrity: null,
      item_enclosure_sources: [
        { id: 1, item_enclosure_id: id, uri: `https://example.test/${type}`, content_type: type },
      ],
    },
    mediaType,
    label: mediaType,
  };
}

describe('buildEmbedEnclosureSelectionParams', () => {
  it('uses the index within the matching media type', () => {
    const audioMpeg = labeled('audio/mpeg', 'audio', 1);
    const audioOgg = labeled('audio/ogg', 'audio', 2);
    const videoMp4 = labeled('video/mp4', 'video', 3);
    const videoWebm = labeled('video/webm', 'video', 4);
    const enclosures = [audioMpeg, audioOgg, videoMp4, videoWebm];

    expect(buildEmbedEnclosureSelectionParams(enclosures, audioOgg)).toEqual({
      type: 'audio',
      enclosureRowSelected: 1,
      sourceRowSelected: 0,
    });

    expect(buildEmbedEnclosureSelectionParams(enclosures, videoWebm)).toEqual({
      type: 'video',
      enclosureRowSelected: 1,
      sourceRowSelected: 0,
    });
  });
});
