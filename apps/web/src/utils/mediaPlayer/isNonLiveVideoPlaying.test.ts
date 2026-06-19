import { describe, expect, it } from 'vitest';

import type { DTOItem, DTOItemEnclosure, LabeledItemEnclosure } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import type { MediaPlayerAddByRSSState } from '../../contexts/MediaPlayer';
import { isNonLiveVideoPlaying } from './isNonLiveVideoPlaying';

const defaultEnclosureParams = {
  type: 'default' as const,
  enclosureRowSelected: null,
  sourceRowSelected: null,
};

function makeLabeledEnclosure(mediaType: 'audio' | 'video'): LabeledItemEnclosure {
  const enclosure = {
    item_enclosure_default: true,
    item_enclosure_sources: [
      { uri: `https://example.com/file.${mediaType === 'video' ? 'mp4' : 'mp3'}` },
    ],
    type: mediaType === 'video' ? 'video/mp4' : 'audio/mpeg',
    height: mediaType === 'video' ? 720 : null,
  } as DTOItemEnclosure;

  return {
    enclosure,
    mediaType,
    label: mediaType,
  };
}

describe('isNonLiveVideoPlaying', () => {
  it('returns true for a non-live item with a video enclosure', () => {
    const mpItem = { id_text: 'item001', live_item: null } as DTOItem;
    const result = isNonLiveVideoPlaying({
      mpItem,
      mpAddByRSS: null,
      mpItemLabeledItemEnclosures: [makeLabeledEnclosure('video')],
      mpEnclosureSelectedParams: defaultEnclosureParams,
    });
    expect(result).toBe(true);
  });

  it('returns false for a non-live item with an audio enclosure', () => {
    const mpItem = { id_text: 'item001', live_item: null } as DTOItem;
    const result = isNonLiveVideoPlaying({
      mpItem,
      mpAddByRSS: null,
      mpItemLabeledItemEnclosures: [makeLabeledEnclosure('audio')],
      mpEnclosureSelectedParams: defaultEnclosureParams,
    });
    expect(result).toBe(false);
  });

  it('returns true for add-by-RSS with Video medium fallback when no labeled enclosures', () => {
    const mpAddByRSS: MediaPlayerAddByRSSState = {
      idText: 'abrss01',
      resourceData: { medium_id: MediumEnum.Video },
    };
    const result = isNonLiveVideoPlaying({
      mpItem: null,
      mpAddByRSS,
      mpItemLabeledItemEnclosures: [],
      mpEnclosureSelectedParams: defaultEnclosureParams,
    });
    expect(result).toBe(true);
  });

  it('returns false for a live item even when the enclosure is video', () => {
    const mpItem = { id_text: 'live001', live_item: { id: 1 } } as DTOItem;
    const result = isNonLiveVideoPlaying({
      mpItem,
      mpAddByRSS: null,
      mpItemLabeledItemEnclosures: [makeLabeledEnclosure('video')],
      mpEnclosureSelectedParams: defaultEnclosureParams,
    });
    expect(result).toBe(false);
  });
});
