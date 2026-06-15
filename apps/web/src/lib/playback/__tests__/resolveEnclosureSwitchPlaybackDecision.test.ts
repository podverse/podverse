import { describe, expect, it } from 'vitest';

import type { DTOClip, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers';

import { resolveEnclosureSwitchPlaybackDecision } from '../resolveEnclosureSwitchPlaybackDecision';

const noopClip = (startTime: number, endTime: number): DTOClip =>
  ({
    id: 100,
    id_text: 'clip-1',
    start_time: startTime,
    end_time: endTime,
    item: { id: 10, id_text: 'item-1' },
  }) as unknown as DTOClip;

const noopSoundbite = (startTime: number, duration: number): DTOItemSoundbite =>
  ({
    id: 200,
    id_text: 'soundbite-1',
    start_time: startTime,
    duration,
    item: { id: 10, id_text: 'item-1' },
  }) as unknown as DTOItemSoundbite;

const noopChapter = (startTime: number, endTime: number): DTOItemChapter =>
  ({
    id: 300,
    id_text: 'chapter-1',
    start_time: startTime,
    end_time: endTime,
    title: 'Test chapter',
    table_of_contents: false,
  }) as unknown as DTOItemChapter;

describe('resolveEnclosureSwitchPlaybackDecision', () => {
  it('preserves resume seconds for a plain item switch', () => {
    const decision = resolveEnclosureSwitchPlaybackDecision({
      resumeAtSeconds: 83,
      mpClip: null,
      mpItemSoundbite: null,
      mpItemChapter: null,
    });

    expect(decision).toEqual({
      initialSeekSeconds: 83,
      pauseAtSeconds: undefined,
      reason: 'enclosure-switch-resume',
      shouldAutoPlay: false,
      shouldClearAutoQueue: false,
      shouldRecordPlaybackStat: false,
    });
  });

  it('preserves near-end resume seconds at staging (near-end clamp runs on loadedmetadata)', () => {
    const decision = resolveEnclosureSwitchPlaybackDecision({
      resumeAtSeconds: 98,
      mpClip: null,
      mpItemSoundbite: null,
      mpItemChapter: null,
    });

    expect(decision.initialSeekSeconds).toBe(98);
  });

  it('re-arms clip pauseAt boundary', () => {
    const decision = resolveEnclosureSwitchPlaybackDecision({
      resumeAtSeconds: 42,
      mpClip: noopClip(30, 60),
      mpItemSoundbite: null,
      mpItemChapter: null,
    });

    expect(decision.pauseAtSeconds).toBe(61);
  });

  it('re-arms soundbite pauseAt boundary', () => {
    const decision = resolveEnclosureSwitchPlaybackDecision({
      resumeAtSeconds: 12,
      mpClip: null,
      mpItemSoundbite: noopSoundbite(10, 20),
      mpItemChapter: null,
    });

    expect(decision.pauseAtSeconds).toBe(31);
  });

  it('re-arms chapter pauseAt boundary', () => {
    const decision = resolveEnclosureSwitchPlaybackDecision({
      resumeAtSeconds: 25,
      mpClip: null,
      mpItemSoundbite: null,
      mpItemChapter: noopChapter(20, 40),
    });

    expect(decision.pauseAtSeconds).toBe(41);
  });
});
