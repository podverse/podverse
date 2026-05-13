import { describe, expect, it } from 'vitest';

import type {
  AddByRSSResourceData,
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import type { MusicItemPlaybackIntent } from '../playbackTarget';
import { resolvePlaybackLoadDecision } from '../resolvePlaybackLoadDecision';

const emptyAbridged: QueueResourcesAbridgedIndex = {
  add_by_rss_resource_datas: {},
  clips: {},
  item_soundbites: {},
  items: {},
};

const channel = (mediumId: number): DTOChannel =>
  // The policy only reads `medium_id` through typed targets in future phases.
  ({
    has_podcast_index_value: false,
    has_value_time_splits: false,
    id: 1,
    id_text: 'channel-1',
    medium_id: mediumId,
    podcast_guid: null,
    slug: null,
    sortable_title: 'test channel',
    title: 'Test channel',
  }) as DTOChannel;

const item = (id: number): DTOItem =>
  // The policy reads only `id`; the full DTO has many unrelated nested fields.
  ({
    channel_id: 1,
    id,
    id_text: `item-${id}`,
    item_about: {},
    item_chat: {},
    item_content_links: [],
    item_enclosures: [],
    item_flag_status_id: 1,
    item_fundings: [],
    item_images: [],
    item_license: {},
    item_location: {},
    item_persons: [],
    item_season: {},
    item_social_interacts: [],
    item_soundbites: [],
    item_transcripts: [],
    item_txts: [],
    item_values: [],
    title: `Item ${id}`,
  }) as DTOItem;

const clip = ({ endTime, startTime }: { endTime?: string; startTime?: string }): DTOClip =>
  ({
    account: {},
    id: 10,
    id_text: 'clip-10',
    item: item(1),
    item_id: '1',
    sharable_status: {},
    start_time: startTime ?? '0',
    end_time: endTime,
  }) as DTOClip;

const soundbite = ({
  duration,
  startTime,
}: {
  duration: string;
  startTime: string;
}): DTOItemSoundbite => ({
  duration,
  id: 20,
  id_text: 'soundbite-20',
  item_id: 1,
  start_time: startTime,
});

const chapter = ({
  endTime,
  startTime,
}: {
  endTime?: string;
  startTime: string;
}): DTOItemChapter => ({
  data_hash: 'hash',
  id: 30,
  id_text: 'chapter-30',
  item_chapters_feed_id: 1,
  start_time: startTime,
  table_of_contents: false,
  end_time: endTime,
});

describe('resolvePlaybackLoadDecision', () => {
  it('clip: seeks to start_time and pauses one second after end_time', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          target: {
            channel: channel(MediumEnum.Podcast),
            clip: clip({ endTime: '30', startTime: '5' }),
            item: item(1),
            kind: 'clip',
          },
        },
        { abridged: emptyAbridged }
      )
    ).toEqual({
      initialSeekSeconds: 5,
      pauseAtSeconds: 31,
      reason: 'clip-start',
      shouldAutoPlay: true,
      shouldClearAutoQueue: true,
      shouldRecordPlaybackStat: true,
    });
  });

  it('clip: invalid start_time resolves to 0 and missing end_time means no pause', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          target: {
            channel: channel(MediumEnum.Podcast),
            clip: clip({ startTime: 'NaN' }),
            item: item(1),
            kind: 'clip',
          },
        },
        { abridged: emptyAbridged }
      )
    ).toEqual({
      initialSeekSeconds: 0,
      pauseAtSeconds: undefined,
      reason: 'clip-start',
      shouldAutoPlay: true,
      shouldClearAutoQueue: true,
      shouldRecordPlaybackStat: true,
    });
  });

  it('soundbite: seeks to start_time and pauses one second after start plus duration', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          target: {
            channel: channel(MediumEnum.Podcast),
            item: item(1),
            kind: 'soundbite',
            soundbite: soundbite({ duration: '20', startTime: '10' }),
          },
        },
        { abridged: emptyAbridged }
      )
    ).toMatchObject({
      initialSeekSeconds: 10,
      pauseAtSeconds: 31,
      reason: 'soundbite-start',
    });
  });

  it('chapter: seeks to start_time and pauses one second after end_time when present', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          target: {
            channel: channel(MediumEnum.Podcast),
            chapter: chapter({ endTime: '44', startTime: '12' }),
            item: item(1),
            kind: 'chapter',
          },
        },
        { abridged: emptyAbridged }
      )
    ).toMatchObject({
      initialSeekSeconds: 12,
      pauseAtSeconds: 45,
      reason: 'chapter-start',
    });
  });

  it('item-podcast: resumes from abridged mid-track position', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          target: {
            channel: channel(MediumEnum.Podcast),
            item: item(100),
            kind: 'item-podcast',
          },
        },
        { abridged: { ...emptyAbridged, items: { 100: { d: '100', p: '30' } } } }
      )
    ).toMatchObject({
      initialSeekSeconds: 30,
      pauseAtSeconds: undefined,
      reason: 'item-podcast-resume',
    });
  });

  it('item-podcast: clamps near-end abridged position to fresh start', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          target: {
            channel: channel(MediumEnum.Podcast),
            item: item(100),
            kind: 'item-podcast',
          },
        },
        { abridged: { ...emptyAbridged, items: { 100: { d: '100', p: '95' } } } }
      )
    ).toMatchObject({
      initialSeekSeconds: 0,
      reason: 'item-podcast-fresh',
    });
  });

  it('item-video: explicit playback seconds win over abridged near-end clamp', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          explicitPlaybackSeconds: 42,
          target: {
            channel: channel(MediumEnum.Video),
            item: item(200),
            kind: 'item-video',
          },
        },
        { abridged: { ...emptyAbridged, items: { 200: { d: '100', p: '95' } } } }
      )
    ).toMatchObject({
      initialSeekSeconds: 42,
      reason: 'item-video-resume',
    });
  });

  it('item-video: uses duration hint when abridged duration is absent', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          mediaFileDurationHintSeconds: 100,
          target: {
            channel: channel(MediumEnum.Video),
            item: item(200),
            kind: 'item-video',
          },
        },
        { abridged: { ...emptyAbridged, items: { 200: { d: '', p: '95' } } } }
      )
    ).toMatchObject({
      initialSeekSeconds: 0,
      reason: 'item-video-fresh',
    });
  });

  it('item-music session_restore: resumes from abridged mid-track without recording a fresh stat', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          target: {
            channel: channel(MediumEnum.Music),
            intent: 'session_restore',
            item: item(300),
            kind: 'item-music',
          },
        },
        { abridged: { ...emptyAbridged, items: { 300: { d: '100', p: '30' } } } }
      )
    ).toMatchObject({
      initialSeekSeconds: 30,
      reason: 'item-music-session-restore',
      shouldClearAutoQueue: false,
      shouldRecordPlaybackStat: false,
    });
  });

  it('item-music session_restore: near-end abridged position clamps to 0', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          target: {
            channel: channel(MediumEnum.Music),
            intent: 'session_restore',
            item: item(300),
            kind: 'item-music',
          },
        },
        { abridged: { ...emptyAbridged, items: { 300: { d: '100', p: '95' } } } }
      )
    ).toMatchObject({
      initialSeekSeconds: 0,
      reason: 'item-music-session-restore',
    });
  });

  it('item-music explicit_play: starts at 0 and clears AutoQueue', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          target: {
            channel: channel(MediumEnum.Music),
            intent: 'explicit_play',
            item: item(300),
            kind: 'item-music',
          },
        },
        { abridged: { ...emptyAbridged, items: { 300: { d: '100', p: '30' } } } }
      )
    ).toMatchObject({
      initialSeekSeconds: 0,
      reason: 'item-music-explicit',
      shouldClearAutoQueue: true,
      shouldRecordPlaybackStat: true,
    });
  });

  it('item-music fresh_transition: starts at 0 and preserves AutoQueue', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          target: {
            channel: channel(MediumEnum.Music),
            intent: 'fresh_transition',
            item: item(300),
            kind: 'item-music',
          },
        },
        { abridged: { ...emptyAbridged, items: { 300: { d: '100', p: '30' } } } }
      )
    ).toMatchObject({
      initialSeekSeconds: 0,
      reason: 'item-music-fresh-transition',
      shouldClearAutoQueue: false,
    });
  });

  it('item-music unknown future intent: safely behaves as fresh_transition', () => {
    const futureIntent: MusicItemPlaybackIntent = 'future_intent' as never;

    expect(
      resolvePlaybackLoadDecision(
        {
          target: {
            channel: channel(MediumEnum.Music),
            intent: futureIntent,
            item: item(300),
            kind: 'item-music',
          },
        },
        { abridged: { ...emptyAbridged, items: { 300: { d: '100', p: '30' } } } }
      )
    ).toMatchObject({
      initialSeekSeconds: 0,
      reason: 'item-music-fresh-transition',
      shouldClearAutoQueue: false,
    });
  });

  it('add-by-rss: resumes from string playback_position and skips server stat tracking', () => {
    const resourceData: AddByRSSResourceData = { playback_position: '120.5' };

    expect(
      resolvePlaybackLoadDecision(
        { target: { kind: 'add-by-rss', resourceData } },
        { abridged: emptyAbridged }
      )
    ).toMatchObject({
      initialSeekSeconds: 120.5,
      reason: 'add-by-rss-resume',
      shouldRecordPlaybackStat: false,
    });
  });

  it('add-by-rss: invalid playback_position starts fresh', () => {
    const resourceData: AddByRSSResourceData = { playback_position: 'NaN' };

    expect(
      resolvePlaybackLoadDecision(
        { target: { kind: 'add-by-rss', resourceData } },
        { abridged: emptyAbridged }
      )
    ).toMatchObject({
      initialSeekSeconds: 0,
      reason: 'add-by-rss-fresh',
      shouldRecordPlaybackStat: false,
    });
  });

  it('livestream: starts at 0 regardless of explicit override', () => {
    expect(
      resolvePlaybackLoadDecision(
        {
          explicitPlaybackSeconds: 120,
          target: {
            channel: channel(MediumEnum.Podcast),
            item: item(400),
            kind: 'livestream',
          },
        },
        { abridged: emptyAbridged }
      )
    ).toMatchObject({
      initialSeekSeconds: 0,
      pauseAtSeconds: undefined,
      reason: 'livestream',
    });
  });
});
