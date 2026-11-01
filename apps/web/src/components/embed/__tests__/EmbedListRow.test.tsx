import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DTOItem } from '@podverse/helpers';
import { formatDateAbbrev, LiveItemStatusEnum } from '@podverse/helpers';

import type { EmbedListRow as EmbedListRowData } from '../../../lib/embed/embedListTypes';
import { EmbedListRow } from '../EmbedListRow';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
  useLocale: () => 'en-US',
}));

vi.mock('../../MediaPlayer/Buttons/PlayButtonRow', () => ({
  PlayButtonRow: () => <button type="button" data-testid="play-button-row-stub" />,
}));

const PUBLISH_DATE = '2026-06-05T00:00:00.000Z';

function createItem(live: boolean): DTOItem {
  return {
    id: 1,
    id_text: live ? 'live-item' : 'episode',
    channel_id: 1,
    pub_date: PUBLISH_DATE,
    item_flag_status_id: 1,
    live_item: live
      ? {
          id: 10,
          item_id: 1,
          live_item_status_id: LiveItemStatusEnum.Live,
          live_item_status: { id: LiveItemStatusEnum.Live },
          start_time: PUBLISH_DATE,
        }
      : null,
    item_about: { id: 1, item_id: 1, duration: '3600' },
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
  };
}

function createRow(item: DTOItem): EmbedListRowData {
  return {
    rowKey: 'row-1',
    playIdText: item.id_text,
    listLabel: 'Morning Show',
    mediaType: 'audio',
    channel: {
      id: 1,
      id_text: 'channel',
      slug: null,
      feed_id: 1,
      podcast_guid: null,
      title: null,
      sortable_title: null,
      medium_id: 1,
      has_podcast_index_value: false,
      has_value_time_splits: false,
    },
    item,
    clip: null,
    itemChapter: null,
    itemSoundbite: null,
  };
}

function renderRow(row: EmbedListRowData) {
  render(<EmbedListRow isActive={false} onSelect={() => undefined} row={row} />);
}

describe('EmbedListRow', () => {
  afterEach(() => {
    cleanup();
  });

  it('places the Live badge first on the meta line and omits the duration', () => {
    renderRow(createRow(createItem(true)));

    const meta = screen.getByTestId('embed-list-row-meta');
    const badge = screen.getByTestId('embed-live-item-status');
    const dateText = badge.nextElementSibling;
    const title = screen.getByText('Morning Show');

    expect(meta.contains(badge)).toBe(true);
    expect(meta.firstElementChild).toBe(badge);
    expect(dateText?.textContent).toContain(formatDateAbbrev(PUBLISH_DATE, 'en-US'));
    expect(dateText?.textContent).not.toContain('time.hr');
    expect(title.parentElement?.querySelector('[data-testid="embed-live-item-status"]')).toBeNull();
  });

  it('keeps the duration on a non-live item row and shows no Live badge', () => {
    renderRow(createRow(createItem(false)));

    const meta = screen.getByTestId('embed-list-row-meta');

    expect(screen.queryByTestId('embed-live-item-status')).toBeNull();
    expect(meta.textContent).toContain('time.hr');
  });
});
