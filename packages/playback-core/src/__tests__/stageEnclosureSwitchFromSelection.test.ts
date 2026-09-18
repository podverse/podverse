import { describe, expect, it } from 'vitest';

import type {
  DTOClip,
  DTOItemEnclosure,
  DTOItemEnclosureSource,
  EnclosureSelectedParams,
  LabeledItemEnclosure,
} from '@podverse/helpers';

import { buildEnclosureSwitchPlaybackDecisionIfChanged } from '../stageEnclosureSwitchFromSelection.js';

const source = (id: number, uri: string): DTOItemEnclosureSource => ({
  id,
  item_enclosure_id: id,
  uri,
});

const enclosure = (params: {
  id: number;
  sourceUri: string;
  type: string;
  item_enclosure_default?: boolean;
}): DTOItemEnclosure =>
  ({
    id: params.id,
    item_id: 1,
    type: params.type,
    item_enclosure_default: params.item_enclosure_default ?? false,
    item_enclosure_integrity: null,
    item_enclosure_sources: [source(params.id, params.sourceUri)],
  }) as unknown as DTOItemEnclosure;

const labeled = (params: {
  id: number;
  sourceUri: string;
  mediaType: 'audio' | 'video';
  type: string;
  item_enclosure_default?: boolean;
}): LabeledItemEnclosure => ({
  enclosure: enclosure(params),
  label: params.mediaType,
  mediaType: params.mediaType,
});

const selectedParams = (
  type: EnclosureSelectedParams['type'],
  enclosureRowSelected: number,
  sourceRowSelected = 0
): EnclosureSelectedParams => ({
  enclosureRowSelected,
  sourceRowSelected,
  type,
});

const noopClip = (): DTOClip =>
  ({
    end_time: 35,
    id: 5,
    id_text: 'clip-5',
    item: { id: 10, id_text: 'item-10' },
    start_time: 10,
  }) as unknown as DTOClip;

describe('buildEnclosureSwitchPlaybackDecisionIfChanged', () => {
  it('returns null when selection params are unchanged', () => {
    const params = selectedParams('audio', 0, 0);
    const decision = buildEnclosureSwitchPlaybackDecisionIfChanged({
      currentEnclosureSelectedParams: params,
      labeledItemEnclosures: [labeled({ id: 1, mediaType: 'audio', sourceUri: 'https://x/a.mp3', type: 'audio/mpeg' })],
      mpClip: null,
      mpItemChapter: null,
      mpItemSoundbite: null,
      nextEnclosureSelectedParams: params,
      resumeAtSeconds: 44,
    });

    expect(decision).toBeNull();
  });

  it('returns null when params differ but resolve to the same URI', () => {
    const entries = [
      labeled({ id: 1, mediaType: 'audio', sourceUri: 'https://x/a.mp3', type: 'audio/mpeg' }),
      labeled({
        id: 2,
        item_enclosure_default: true,
        mediaType: 'audio',
        sourceUri: 'https://x/a.mp3',
        type: 'audio/mpeg',
      }),
    ];
    const decision = buildEnclosureSwitchPlaybackDecisionIfChanged({
      currentEnclosureSelectedParams: selectedParams('audio', 0, 0),
      labeledItemEnclosures: entries,
      mpClip: null,
      mpItemChapter: null,
      mpItemSoundbite: null,
      nextEnclosureSelectedParams: selectedParams('audio', 1, 0),
      resumeAtSeconds: 22,
    });

    expect(decision).toBeNull();
  });

  it('returns an enclosure-switch resume decision when URI changes', () => {
    const entries = [
      labeled({ id: 1, mediaType: 'audio', sourceUri: 'https://x/a.mp3', type: 'audio/mpeg' }),
      labeled({ id: 2, mediaType: 'video', sourceUri: 'https://x/v.mp4', type: 'video/mp4' }),
    ];
    const decision = buildEnclosureSwitchPlaybackDecisionIfChanged({
      currentEnclosureSelectedParams: selectedParams('audio', 0, 0),
      labeledItemEnclosures: entries,
      mpClip: noopClip(),
      mpItemChapter: null,
      mpItemSoundbite: null,
      nextEnclosureSelectedParams: selectedParams('video', 0, 0),
      resumeAtSeconds: 18,
    });

    expect(decision).toEqual({
      initialSeekSeconds: 18,
      pauseAtSeconds: 36,
      reason: 'enclosure-switch-resume',
      shouldAutoPlay: false,
      shouldClearAutoQueue: false,
      shouldRecordPlaybackStat: false,
    });
  });
});
