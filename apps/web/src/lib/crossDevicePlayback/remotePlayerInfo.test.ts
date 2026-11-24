import { describe, expect, it } from 'vitest';

import type {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOPlaybackResourceSummary,
  DTOPlaybackState,
} from '@podverse/helpers';
import {
  buildEpisodePath,
  buildPodcastPath,
  buildTrackPath,
  getPlaybackRemoteControls,
  MediumEnum,
} from '@podverse/helpers';

import { getAddByRSSItemPath } from '../../utils/addByRSS/itemPath';
import type { RemotePlayerDisplay } from './remotePlayerDisplay';
import { remoteItemLinkUrlFromSummary, resolveRemotePlayerInfo } from './remotePlayerInfo';
import type { RemotePlayerResource } from './remotePlayerResourceStore';

function summary(
  ref: DTOPlaybackResourceSummary['ref'],
  medium: MediumEnum,
  overrides: Partial<Pick<DTOPlaybackResourceSummary, 'title' | 'channel_title' | 'image_url'>> = {}
): DTOPlaybackResourceSummary {
  return {
    ref,
    medium,
    title: 'Summary title',
    channel_title: 'Summary show',
    image_url: null,
    ...overrides,
  };
}

function makeDisplay(
  resource: DTOPlaybackResourceSummary,
  overrides: Partial<DTOPlaybackState> = {}
): RemotePlayerDisplay {
  const isLive = overrides.is_live === true;
  const state: DTOPlaybackState = {
    revision: 1,
    active_session_id_text: 'session-other',
    status: 'playing',
    is_live: isLive,
    position_seconds: isLive ? null : 25,
    duration_seconds: isLive ? null : 100,
    rate: 1,
    updated_at_ms: 0,
    sent_at_ms: 0,
    ...overrides,
    resource,
  };
  return {
    state,
    resource,
    controls: getPlaybackRemoteControls({ isLive: state.is_live }),
  };
}

function makeChannel(overrides: Partial<DTOChannel> = {}): DTOChannel {
  return {
    id: 1,
    id_text: 'show-1',
    slug: null,
    feed_id: 1,
    podcast_guid: null,
    title: 'Show Name',
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
    title: 'Episode Name',
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

function makeChapter(
  overrides: Partial<DTOItemChapter> &
    Pick<DTOItemChapter, 'id' | 'id_text' | 'start_time' | 'end_time' | 'title'>
): DTOItemChapter {
  return {
    item_chapters_feed_id: 1,
    data_hash: 'hash',
    table_of_contents: true,
    ...overrides,
  };
}

const OPENING = makeChapter({
  id: 1,
  id_text: 'ch-opening',
  title: 'Opening',
  start_time: '1',
  end_time: '20',
});

const SECOND = makeChapter({
  id: 2,
  id_text: 'ch-second',
  title: 'Second chapter',
  start_time: '21',
  end_time: '60',
});

const CLIP: DTOClip = {
  id: 2,
  id_text: 'clip-1',
  account: { id: 1, id_text: 'account-1', verified: true },
  item_id: 'item-1',
  start_time: '12',
  end_time: '40',
  title: 'Best bit',
  sharable_status: { id: 1, status: 'public' },
};

function databaseResource(
  overrides: Partial<Extract<RemotePlayerResource, { kind: 'database' }>> = {}
): Extract<RemotePlayerResource, { kind: 'database' }> {
  return {
    kind: 'database',
    channel: makeChannel(),
    item: makeItem(),
    clip: null,
    itemSoundbite: null,
    itemChapters: [OPENING, SECOND],
    ...overrides,
  };
}

describe('remoteItemLinkUrlFromSummary', () => {
  it('builds an episode path for a podcast or video item ref', () => {
    expect(
      remoteItemLinkUrlFromSummary(
        summary({ kind: 'item', item_id_text: 'ep-1' }, MediumEnum.Podcast)
      )
    ).toBe(buildEpisodePath('ep-1'));
    expect(
      remoteItemLinkUrlFromSummary(
        summary({ kind: 'item', item_id_text: 'vid-1' }, MediumEnum.Video)
      )
    ).toBe(buildEpisodePath('vid-1'));
  });

  it('builds a track path for a music item ref', () => {
    expect(
      remoteItemLinkUrlFromSummary(
        summary({ kind: 'item', item_id_text: 'trk-1' }, MediumEnum.Music)
      )
    ).toBe(buildTrackPath('trk-1'));
  });

  it('returns an empty link when the ref alone cannot name the item page', () => {
    expect(
      remoteItemLinkUrlFromSummary(
        summary({ kind: 'clip', clip_id_text: 'clip-1' }, MediumEnum.Podcast)
      )
    ).toBe('');
    expect(
      remoteItemLinkUrlFromSummary(
        summary({ kind: 'add_by_rss', add_by_rss_hash_id: 'abr-1' }, MediumEnum.Podcast)
      )
    ).toBe('');
  });
});

describe('resolveRemotePlayerInfo', () => {
  it('uses the summary titles and the medium link before records resolve', () => {
    const resource = summary({ kind: 'item', item_id_text: 'ep-1' }, MediumEnum.Podcast);
    const info = resolveRemotePlayerInfo({
      display: makeDisplay(resource),
      resource: null,
      positionSeconds: null,
    });
    expect(info.resolution.itemTitle).toBe('Summary title');
    expect(info.resolution.channelTitle).toBe('Summary show');
    expect(info.resolution.compactChannelLine).toBe('Summary show');
    expect(info.resolution.itemLinkUrl).toBe(buildEpisodePath('ep-1'));
    expect(info.resolution.channelLinkUrl).toBe('');
    expect(info.segment).toBeNull();
  });

  it('names the chapter at the estimated position and links the show', () => {
    const info = resolveRemotePlayerInfo({
      display: makeDisplay(summary({ kind: 'item', item_id_text: 'item-1' }, MediumEnum.Podcast)),
      resource: databaseResource(),
      positionSeconds: 25,
    });
    expect(info.resolution.subsectionTitle).toBe('Second chapter');
    expect(info.resolution.channelLinkUrl).toBe(buildPodcastPath('show-1'));
    expect(info.segment).toEqual({ kind: 'chapter', title: 'Second chapter' });
  });

  it('names a clip ahead of chapters', () => {
    const info = resolveRemotePlayerInfo({
      display: makeDisplay(summary({ kind: 'clip', clip_id_text: 'clip-1' }, MediumEnum.Podcast)),
      resource: databaseResource({ clip: CLIP, itemChapters: [OPENING, SECOND] }),
      positionSeconds: 25,
    });
    expect(info.segment).toEqual({ kind: 'clip', title: 'Best bit' });
  });

  it('shows no segment for a livestream', () => {
    const info = resolveRemotePlayerInfo({
      display: makeDisplay(summary({ kind: 'item', item_id_text: 'item-1' }, MediumEnum.Podcast), {
        is_live: true,
        position_seconds: null,
        duration_seconds: null,
      }),
      resource: databaseResource(),
      positionSeconds: 25,
    });
    expect(info.segment).toBeNull();
  });

  it('links an Add by RSS item from its id text', () => {
    const info = resolveRemotePlayerInfo({
      display: makeDisplay(
        summary({ kind: 'add_by_rss', add_by_rss_hash_id: 'abr-1' }, MediumEnum.Podcast)
      ),
      resource: {
        kind: 'add_by_rss',
        idText: 'rss-item-1',
        resourceData: { title: 'Feed episode' },
        hashId: 'abr-1',
      },
      positionSeconds: 10,
    });
    expect(info.resolution.itemLinkUrl).toBe(getAddByRSSItemPath('rss-item-1'));
    expect(info.segment).toBeNull();
  });

  it('falls back to the summary titles when the records have none', () => {
    const info = resolveRemotePlayerInfo({
      display: makeDisplay(summary({ kind: 'item', item_id_text: 'item-1' }, MediumEnum.Podcast)),
      resource: databaseResource({
        channel: makeChannel({ title: null }),
        item: makeItem({ title: null }),
        itemChapters: null,
      }),
      positionSeconds: 10,
    });
    expect(info.resolution.itemTitle).toBe('Summary title');
    expect(info.resolution.channelTitle).toBe('Summary show');
    expect(info.resolution.compactChannelLine).toBe('Summary show');
  });
});
