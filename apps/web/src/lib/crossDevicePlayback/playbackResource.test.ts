import { describe, expect, it } from 'vitest';

import type {
  AddByRSSResourceData,
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
} from '@podverse/helpers';
import {
  getAddByRSSHashId,
  isDTOPlaybackResourceSummary,
  LiveItemStatusEnum,
  MediumEnum,
  PLAYBACK_TEXT_FIELD_MAX_LENGTH,
} from '@podverse/helpers';

import type { PlayerResourceInput } from './playbackResource';
import {
  buildPlaybackResourceRefFromPlayer,
  buildPlaybackResourceRefFromTarget,
  buildPlaybackResourceSummary,
  buildPlaybackStatePublishBody,
  isSamePlaybackResourceRef,
  nearestPlaybackSpeedValue,
  playbackStartSecondsFromTarget,
} from './playbackResource';

function makeChannel(overrides: Partial<DTOChannel> = {}): DTOChannel {
  return {
    id: 1,
    id_text: 'channel-1',
    slug: null,
    feed_id: 1,
    podcast_guid: null,
    title: 'Channel Title',
    sortable_title: null,
    medium_id: MediumEnum.Podcast,
    has_value_time_splits: false,
    ...overrides,
  };
}

function makeItem(overrides: Partial<DTOItem> = {}): DTOItem {
  return {
    id: 1,
    id_text: 'item-1',
    channel_id: 1,
    title: 'Episode Title',
    item_flag_status_id: 1,
    item_about: { id: 1, item_id: 1 },
    item_chat: { id: 1, item_id: 1, server: 'chat.example.com' },
    item_license: { id: 1, item_id: 1, identifier: 'CC-BY', url: null },
    item_location: { id: 1, item_id: 1, name: null },
    item_season: { id: 1, channel_season_id: 1, item_id: 1, title: null },
    item_content_links: [],
    item_enclosures: [],
    item_fundings: [],
    item_images: [],
    item_persons: [],
    item_social_interacts: [],
    item_soundbites: [],
    item_transcripts: [],
    item_txts: [],
    item_values: [],
    ...overrides,
  };
}

const CLIP: DTOClip = {
  id: 2,
  id_text: 'clip-1',
  account: { id: 1, id_text: 'account-1', verified: true },
  item_id: 'item-1',
  start_time: '30',
  end_time: '60',
  title: 'Clip Title',
  sharable_status: { id: 1, status: 'public' },
};

const CHAPTER: DTOItemChapter = {
  id: 3,
  id_text: 'chapter-1',
  item_chapters_feed_id: 1,
  data_hash: 'hash',
  start_time: '120',
  end_time: '300',
  title: 'Chapter Title',
  table_of_contents: false,
};

const ADD_BY_RSS_RESOURCE_DATA: AddByRSSResourceData = {
  title: 'Add by RSS Episode',
  feed_url: 'https://example.com/feed.xml',
  guid: 'episode-guid-1',
};

function makePlayer(overrides: Partial<PlayerResourceInput> = {}): PlayerResourceInput {
  return {
    mpAddByRSS: null,
    mpChannel: null,
    mpItem: null,
    mpClip: null,
    mpItemSoundbite: null,
    mpItemChapter: null,
    mpItemChapters: null,
    ...overrides,
  };
}

const PUBLISH_DEFAULTS = {
  isPlaying: true,
  shouldPlay: true,
  currentTimeSeconds: 42,
  durationSeconds: 600,
  rate: 1,
  claim: false,
};

describe('playback resource refs', () => {
  it('uses the Add by RSS hash for an Add by RSS player', () => {
    const ref = buildPlaybackResourceRefFromPlayer(
      makePlayer({ mpAddByRSS: { idText: 'local-1', resourceData: ADD_BY_RSS_RESOURCE_DATA } })
    );

    expect(ref).toEqual({
      kind: 'add_by_rss',
      add_by_rss_hash_id: getAddByRSSHashId(ADD_BY_RSS_RESOURCE_DATA),
    });
  });

  it('uses the clip id for a clip player', () => {
    const ref = buildPlaybackResourceRefFromPlayer(
      makePlayer({ mpChannel: makeChannel(), mpItem: makeItem(), mpClip: CLIP })
    );

    expect(ref).toEqual({ kind: 'clip', clip_id_text: 'clip-1' });
  });

  it('uses the item id for a chapter target', () => {
    const ref = buildPlaybackResourceRefFromTarget({
      kind: 'chapter',
      chapter: CHAPTER,
      item: makeItem(),
      channel: makeChannel(),
    });

    expect(ref).toEqual({ kind: 'item', item_id_text: 'item-1' });
  });

  it('never treats refs of different kinds as the same resource', () => {
    expect(
      isSamePlaybackResourceRef(
        { kind: 'item', item_id_text: 'shared-id' },
        { kind: 'clip', clip_id_text: 'shared-id' }
      )
    ).toBe(false);
  });

  it('starts a chapter target at the chapter start when no explicit start is given', () => {
    const target = {
      kind: 'chapter' as const,
      chapter: CHAPTER,
      item: makeItem(),
      channel: makeChannel(),
    };

    expect(playbackStartSecondsFromTarget(target, undefined)).toBe(120);
    expect(playbackStartSecondsFromTarget(target, 15)).toBe(15);
  });
});

describe('buildPlaybackStatePublishBody', () => {
  it('publishes a live item with no position or duration and rate 1, even at speed 1.5', () => {
    const body = buildPlaybackStatePublishBody({
      ...PUBLISH_DEFAULTS,
      rate: 1.5,
      player: makePlayer({
        mpChannel: makeChannel(),
        mpItem: makeItem({
          live_item: {
            id: 1,
            item_id: 1,
            live_item_status: { id: LiveItemStatusEnum.Live },
            live_item_status_id: LiveItemStatusEnum.Live,
            start_time: '2026-10-25T00:00:00.000Z',
          },
        }),
      }),
    });

    expect(body.is_live).toBe(true);
    expect(body.position_seconds).toBeNull();
    expect(body.duration_seconds).toBeNull();
    expect(body.rate).toBe(1);
    expect(isDTOPlaybackResourceSummary(body.resource)).toBe(true);
  });

  it('reports loading while the player should play but is not playing yet', () => {
    const body = buildPlaybackStatePublishBody({
      ...PUBLISH_DEFAULTS,
      isPlaying: false,
      shouldPlay: true,
      player: makePlayer({ mpChannel: makeChannel(), mpItem: makeItem() }),
    });

    expect(body.status).toBe('loading');
    expect(body.position_seconds).toBe(42);
    expect(body.duration_seconds).toBe(600);
    expect(isDTOPlaybackResourceSummary(body.resource)).toBe(true);
  });

  it('gives the release body when nothing is loaded', () => {
    const body = buildPlaybackStatePublishBody({ ...PUBLISH_DEFAULTS, player: makePlayer() });

    expect(body).toEqual({
      claim: false,
      resource: null,
      status: 'paused',
      is_live: false,
      position_seconds: null,
      duration_seconds: null,
      rate: 1,
    });
  });

  it('cuts a long episode title to the shared text limit', () => {
    const body = buildPlaybackStatePublishBody({
      ...PUBLISH_DEFAULTS,
      player: makePlayer({
        mpChannel: makeChannel(),
        mpItem: makeItem({ title: 'a'.repeat(600) }),
      }),
    });

    expect(body.resource?.title).toHaveLength(PLAYBACK_TEXT_FIELD_MAX_LENGTH);
    expect(PLAYBACK_TEXT_FIELD_MAX_LENGTH).toBe(500);
    expect(isDTOPlaybackResourceSummary(body.resource)).toBe(true);
  });
});

describe('buildPlaybackResourceSummary medium', () => {
  it('uses the channel medium for an item', () => {
    const summary = buildPlaybackResourceSummary(
      makePlayer({ mpChannel: makeChannel({ medium_id: MediumEnum.Music }), mpItem: makeItem() }),
      0
    );

    expect(summary?.medium).toBe(MediumEnum.Music);
    expect(isDTOPlaybackResourceSummary(summary)).toBe(true);
  });

  it('uses the channel medium for a clip', () => {
    const summary = buildPlaybackResourceSummary(
      makePlayer({
        mpChannel: makeChannel({ medium_id: MediumEnum.Video }),
        mpItem: makeItem(),
        mpClip: CLIP,
      }),
      0
    );

    expect(summary?.medium).toBe(MediumEnum.Video);
    expect(isDTOPlaybackResourceSummary(summary)).toBe(true);
  });

  it('uses the Add by RSS feed medium for an Add by RSS item', () => {
    const summary = buildPlaybackResourceSummary(
      makePlayer({
        mpAddByRSS: {
          idText: 'local-1',
          resourceData: { ...ADD_BY_RSS_RESOURCE_DATA, medium_id: MediumEnum.Video },
        },
      }),
      0
    );

    expect(summary?.medium).toBe(MediumEnum.Video);
    expect(isDTOPlaybackResourceSummary(summary)).toBe(true);
  });

  it('reads as Podcast for an Add by RSS item with no medium and for an item with no channel', () => {
    const addByRSSSummary = buildPlaybackResourceSummary(
      makePlayer({ mpAddByRSS: { idText: 'local-1', resourceData: ADD_BY_RSS_RESOURCE_DATA } }),
      0
    );
    const itemSummary = buildPlaybackResourceSummary(
      makePlayer({ mpChannel: null, mpItem: makeItem() }),
      0
    );

    expect(addByRSSSummary?.medium).toBe(MediumEnum.Podcast);
    expect(itemSummary?.medium).toBe(MediumEnum.Podcast);
    expect(isDTOPlaybackResourceSummary(addByRSSSummary)).toBe(true);
    expect(isDTOPlaybackResourceSummary(itemSummary)).toBe(true);
  });
});

describe('nearestPlaybackSpeedValue', () => {
  it('snaps to the nearest web speed, with ties going to the lower speed', () => {
    expect(nearestPlaybackSpeedValue(1.1)).toBe(1.12);
    expect(nearestPlaybackSpeedValue(0.81)).toBe(0.75);
  });
});
