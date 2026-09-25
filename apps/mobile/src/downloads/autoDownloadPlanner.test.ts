import { describe, expect, it } from 'vitest';

import type { DTOItem } from '@podverse/helpers/dto';

import {
  type AutoDownloadChannelSettings,
  autoDownloadNetworkFromNetInfoType,
  planAutoDownloads,
} from './autoDownloadPlanner';

const channel = (
  overrides: Partial<AutoDownloadChannelSettings> &
    Pick<AutoDownloadChannelSettings, 'channelIdText'>
): AutoDownloadChannelSettings => ({
  allowCellular: false,
  enabled: true,
  enabledAtMs: Date.parse('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

const item = (overrides: {
  id_text: string;
  channelIdText: string;
  pub_date: string;
  live?: boolean;
  enclosureType?: string;
  enclosureUri?: string;
}): DTOItem =>
  ({
    id_text: overrides.id_text,
    pub_date: overrides.pub_date,
    live_item: overrides.live === true ? { status: 'live' } : null,
    channel: { id_text: overrides.channelIdText },
    item_enclosures: [
      {
        type: overrides.enclosureType ?? 'audio/mpeg',
        item_enclosure_sources: [{ uri: overrides.enclosureUri ?? 'https://example.com/ep.mp3' }],
      },
    ],
  }) as DTOItem;

describe('planAutoDownloads', () => {
  it('enqueues a new eligible item on Wi-Fi after the watermark', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1' })]]);
    const actions = planAutoDownloads({
      channelsByIdText: channels,
      existingStatuses: new Map(),
      items: [
        item({
          id_text: 'ep1',
          channelIdText: 'ch1',
          pub_date: '2026-02-01T00:00:00.000Z',
        }),
      ],
      network: 'wifi',
      transfersAllowed: true,
    });
    expect(actions).toEqual([{ kind: 'enqueue', itemIdText: 'ep1', channelIdText: 'ch1' }]);
  });

  it('defers on cellular when the channel disallows it', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1', allowCellular: false })]]);
    const actions = planAutoDownloads({
      channelsByIdText: channels,
      existingStatuses: new Map(),
      items: [
        item({
          id_text: 'ep1',
          channelIdText: 'ch1',
          pub_date: '2026-02-01T00:00:00.000Z',
        }),
      ],
      network: 'cellular',
      transfersAllowed: true,
    });
    expect(actions).toEqual([{ kind: 'pending_network', itemIdText: 'ep1', channelIdText: 'ch1' }]);
  });

  it('skips items at or before the enabled_at watermark', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1' })]]);
    const actions = planAutoDownloads({
      channelsByIdText: channels,
      existingStatuses: new Map(),
      items: [
        item({
          id_text: 'ep0',
          channelIdText: 'ch1',
          pub_date: '2025-12-01T00:00:00.000Z',
        }),
      ],
      network: 'wifi',
      transfersAllowed: true,
    });
    expect(actions).toEqual([{ kind: 'skip_before_watermark', itemIdText: 'ep0' }]);
  });

  it('does not re-decide user_removed or enqueued items', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1' })]]);
    const actions = planAutoDownloads({
      channelsByIdText: channels,
      existingStatuses: new Map([
        ['ep1', 'user_removed'],
        ['ep2', 'enqueued'],
      ]),
      items: [
        item({
          id_text: 'ep1',
          channelIdText: 'ch1',
          pub_date: '2026-02-01T00:00:00.000Z',
        }),
        item({
          id_text: 'ep2',
          channelIdText: 'ch1',
          pub_date: '2026-02-02T00:00:00.000Z',
        }),
      ],
      network: 'wifi',
      transfersAllowed: true,
    });
    expect(actions).toEqual([
      { kind: 'skip_already_decided', itemIdText: 'ep1' },
      { kind: 'skip_already_decided', itemIdText: 'ep2' },
    ]);
  });

  it('skips an obvious non-media enclosure with the same reason as manual download', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1' })]]);
    const actions = planAutoDownloads({
      channelsByIdText: channels,
      existingStatuses: new Map(),
      items: [
        item({
          id_text: 'notes',
          channelIdText: 'ch1',
          pub_date: '2026-02-01T00:00:00.000Z',
          enclosureType: 'application/pdf',
          enclosureUri: 'https://example.com/notes.pdf',
        }),
      ],
      network: 'wifi',
      transfersAllowed: true,
    });
    expect(actions[0]).toMatchObject({
      kind: 'skip_ineligible',
      itemIdText: 'notes',
      reason: 'unsupported_source',
    });
  });

  it('marks livestreams ineligible', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1' })]]);
    const actions = planAutoDownloads({
      channelsByIdText: channels,
      existingStatuses: new Map(),
      items: [
        item({
          id_text: 'live1',
          channelIdText: 'ch1',
          pub_date: '2026-02-01T00:00:00.000Z',
          live: true,
        }),
      ],
      network: 'wifi',
      transfersAllowed: true,
    });
    expect(actions[0]).toMatchObject({
      kind: 'skip_ineligible',
      itemIdText: 'live1',
      reason: 'livestream',
    });
  });

  it('lets push item ids bypass the watermark when the channel is enabled', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1' })]]);
    const actions = planAutoDownloads({
      channelsByIdText: channels,
      existingStatuses: new Map(),
      items: [
        item({
          id_text: 'pushed',
          channelIdText: 'ch1',
          pub_date: '2025-01-01T00:00:00.000Z',
        }),
      ],
      network: 'wifi',
      transfersAllowed: true,
      pushItemIdTexts: new Set(['pushed']),
    });
    expect(actions).toEqual([{ kind: 'enqueue', itemIdText: 'pushed', channelIdText: 'ch1' }]);
  });

  it('catch-up keeps the newest episodes across podcasts and skips the rest', () => {
    const channels = new Map([
      ['ch1', channel({ channelIdText: 'ch1' })],
      ['ch2', channel({ channelIdText: 'ch2' })],
    ]);
    const actions = planAutoDownloads({
      catchUpLimit: 2,
      channelsByIdText: channels,
      existingStatuses: new Map(),
      items: [
        item({ id_text: 'old', channelIdText: 'ch1', pub_date: '2026-02-01T00:00:00.000Z' }),
        item({ id_text: 'mid', channelIdText: 'ch2', pub_date: '2026-03-01T00:00:00.000Z' }),
        item({ id_text: 'new', channelIdText: 'ch1', pub_date: '2026-04-01T00:00:00.000Z' }),
      ],
      mode: 'catch_up',
      network: 'wifi',
      transfersAllowed: true,
    });
    expect(actions).toEqual([
      { kind: 'skip_over_cap', itemIdText: 'old', channelIdText: 'ch1' },
      { kind: 'enqueue', itemIdText: 'mid', channelIdText: 'ch2' },
      { kind: 'enqueue', itemIdText: 'new', channelIdText: 'ch1' },
    ]);
  });

  it('catch-up leaves Wi-Fi waits inside the limit pending and skips older ones', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1', allowCellular: false })]]);
    const actions = planAutoDownloads({
      catchUpLimit: 1,
      channelsByIdText: channels,
      existingStatuses: new Map(),
      items: [
        item({ id_text: 'older', channelIdText: 'ch1', pub_date: '2026-02-01T00:00:00.000Z' }),
        item({ id_text: 'newer', channelIdText: 'ch1', pub_date: '2026-03-01T00:00:00.000Z' }),
      ],
      mode: 'catch_up',
      network: 'cellular',
      transfersAllowed: true,
    });
    expect(actions).toEqual([
      { kind: 'skip_over_cap', itemIdText: 'older', channelIdText: 'ch1' },
      { kind: 'pending_network', itemIdText: 'newer', channelIdText: 'ch1' },
    ]);
  });

  it('does not apply the cap when transfers are paused', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1' })]]);
    const actions = planAutoDownloads({
      catchUpLimit: 1,
      channelsByIdText: channels,
      existingStatuses: new Map(),
      items: [
        item({ id_text: 'a', channelIdText: 'ch1', pub_date: '2026-02-01T00:00:00.000Z' }),
        item({ id_text: 'b', channelIdText: 'ch1', pub_date: '2026-03-01T00:00:00.000Z' }),
      ],
      mode: 'catch_up',
      network: 'wifi',
      transfersAllowed: false,
    });
    expect(actions.every((action) => action.kind === 'pending_network')).toBe(true);
  });

  it('incremental push does not skip the rest of the backlog', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1' })]]);
    const actions = planAutoDownloads({
      catchUpLimit: 1,
      channelsByIdText: channels,
      existingStatuses: new Map(),
      items: [
        item({ id_text: 'old', channelIdText: 'ch1', pub_date: '2026-02-01T00:00:00.000Z' }),
        item({ id_text: 'pushed', channelIdText: 'ch1', pub_date: '2026-04-01T00:00:00.000Z' }),
      ],
      mode: 'incremental',
      network: 'wifi',
      transfersAllowed: true,
      pushItemIdTexts: new Set(['pushed']),
    });
    expect(actions).toEqual([{ kind: 'enqueue', itemIdText: 'pushed', channelIdText: 'ch1' }]);
  });

  it('retry_pending only revisits rows already waiting', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1' })]]);
    const actions = planAutoDownloads({
      channelsByIdText: channels,
      existingStatuses: new Map([
        ['waiting', 'pending'],
        ['fresh', 'pending'],
      ]),
      items: [
        item({ id_text: 'waiting', channelIdText: 'ch1', pub_date: '2026-02-01T00:00:00.000Z' }),
        item({ id_text: 'ignored', channelIdText: 'ch1', pub_date: '2026-05-01T00:00:00.000Z' }),
      ],
      mode: 'retry_pending',
      network: 'wifi',
      transfersAllowed: true,
    });
    expect(actions).toEqual([{ kind: 'enqueue', itemIdText: 'waiting', channelIdText: 'ch1' }]);
  });

  it('does not re-decide episodes already skipped for the cap', () => {
    const channels = new Map([['ch1', channel({ channelIdText: 'ch1' })]]);
    const actions = planAutoDownloads({
      channelsByIdText: channels,
      existingStatuses: new Map([['old', 'skipped_over_cap']]),
      items: [item({ id_text: 'old', channelIdText: 'ch1', pub_date: '2026-02-01T00:00:00.000Z' })],
      mode: 'catch_up',
      network: 'wifi',
      transfersAllowed: true,
    });
    expect(actions).toEqual([{ kind: 'skip_already_decided', itemIdText: 'old' }]);
  });
});

describe('autoDownloadNetworkFromNetInfoType', () => {
  it('maps common NetInfo types', () => {
    expect(autoDownloadNetworkFromNetInfoType('wifi', true)).toBe('wifi');
    expect(autoDownloadNetworkFromNetInfoType('cellular', true)).toBe('cellular');
    expect(autoDownloadNetworkFromNetInfoType('none', false)).toBe('none');
    expect(autoDownloadNetworkFromNetInfoType('unknown', true)).toBe('unknown');
  });
});
