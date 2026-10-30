import { describe, expect, it } from 'vitest';

import type { PlaybackStatePublishBody } from '@podverse/helpers';
import { MediumEnum } from '@podverse/helpers';

import type { BroadcastChannelLike } from '../notifications/stream/notificationStreamCoordinator';
import type { PlaybackTabMessage } from './playbackTabChannel';
import { startPlaybackTabChannel } from './playbackTabChannel';

/** Lets queued channel deliveries run. */
const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

type FakeChannel = BroadcastChannelLike & { name: string; closed: boolean };

/** Delivers each message to every other open channel of the same name, asynchronously. */
function createChannelHub() {
  const channels = new Set<FakeChannel>();

  const deliver = (from: FakeChannel | null, name: string, message: unknown) => {
    const data: unknown = JSON.parse(JSON.stringify(message));
    for (const other of channels) {
      if (other !== from && other.name === name) {
        queueMicrotask(() => {
          if (!other.closed) {
            other.onmessage?.(new MessageEvent('message', { data }));
          }
        });
      }
    }
  };

  const create = (name: string): BroadcastChannelLike => {
    const channel: FakeChannel = {
      name,
      closed: false,
      onmessage: null,
      postMessage(message) {
        deliver(channel, name, message);
      },
      close() {
        channel.closed = true;
        channels.delete(channel);
      },
    };
    channels.add(channel);
    return channel;
  };

  /** Posts raw data as if from a tab running other code. */
  const inject = (name: string, message: unknown) => {
    deliver(null, name, message);
  };

  return { create, inject };
}

const LAST_STATE: PlaybackStatePublishBody = {
  claim: false,
  resource: {
    ref: { kind: 'item', item_id_text: 'item-1' },
    medium: MediumEnum.Podcast,
    title: 'Episode Title',
    channel_title: 'Channel Title',
    image_url: null,
  },
  status: 'paused',
  is_live: false,
  position_seconds: 42,
  duration_seconds: 600,
  rate: 1,
};

function startTab(
  hub: ReturnType<typeof createChannelHub>,
  params: { accountId: number; tabId: string }
) {
  const received: PlaybackTabMessage[] = [];
  const channel = startPlaybackTabChannel({
    ...params,
    createChannel: hub.create,
    onMessage: (message) => received.push(message),
  });
  return { channel, received };
}

describe('startPlaybackTabChannel', () => {
  it('delivers messages from other tabs of the same account and ignores the rest', async () => {
    const hub = createChannelHub();
    const tabA = startTab(hub, { accountId: 1, tabId: 'tab-a' });
    const tabB = startTab(hub, { accountId: 1, tabId: 'tab-b' });
    const otherAccount = startTab(hub, { accountId: 2, tabId: 'tab-c' });

    tabA.channel.announceAudioTab(1_000);
    otherAccount.channel.announceFocused(2_000);
    hub.inject('podverse:playback-tabs', { kind: 'tab-gone', accountId: 1, tabId: 'tab-b' });
    await flush();

    expect(tabB.received).toEqual([
      { kind: 'audio-tab', accountId: 1, tabId: 'tab-a', claimedAtMs: 1_000 },
    ]);
    expect(tabA.received).toEqual([{ kind: 'tab-gone', accountId: 1, tabId: 'tab-b' }]);
    expect(otherAccount.received).toEqual([]);
  });

  it('passes a valid last state through and reads a malformed one as null', async () => {
    const hub = createChannelHub();
    const tabA = startTab(hub, { accountId: 1, tabId: 'tab-a' });
    const tabB = startTab(hub, { accountId: 1, tabId: 'tab-b' });

    tabA.channel.announceAudioTabGone(LAST_STATE);
    hub.inject('podverse:playback-tabs', {
      kind: 'audio-tab-gone',
      accountId: 1,
      tabId: 'tab-c',
      lastState: { ...LAST_STATE, status: 'stopped', rate: 'fast' },
    });
    await flush();

    expect(tabB.received).toEqual([
      { kind: 'audio-tab-gone', accountId: 1, tabId: 'tab-a', lastState: LAST_STATE },
      { kind: 'audio-tab-gone', accountId: 1, tabId: 'tab-c', lastState: null },
    ]);
  });

  it('delivers an audio-tab query to another tab of the same account and drops a malformed one', async () => {
    const hub = createChannelHub();
    const tabA = startTab(hub, { accountId: 1, tabId: 'tab-a' });
    const tabB = startTab(hub, { accountId: 1, tabId: 'tab-b' });

    tabA.channel.askForAudioTab();
    hub.inject('podverse:playback-tabs', { kind: 'audio-tab-query', accountId: 1, tabId: '' });
    await flush();

    expect(tabB.received).toEqual([{ kind: 'audio-tab-query', accountId: 1, tabId: 'tab-a' }]);
    expect(tabA.received).toEqual([]);
  });

  it('is unavailable without a channel factory', () => {
    const received: PlaybackTabMessage[] = [];
    const channel = startPlaybackTabChannel({
      accountId: 1,
      tabId: 'tab-a',
      createChannel: null,
      onMessage: (message) => received.push(message),
    });

    expect(channel.available).toBe(false);
    expect(() => {
      channel.announceAudioTab(1_000);
      channel.announceGone();
      channel.close();
    }).not.toThrow();
    expect(received).toEqual([]);
  });

  it('stops delivering after close', async () => {
    const hub = createChannelHub();
    const tabA = startTab(hub, { accountId: 1, tabId: 'tab-a' });
    const tabB = startTab(hub, { accountId: 1, tabId: 'tab-b' });

    tabB.channel.close();
    tabA.channel.announceFocused(3_000);
    await flush();

    expect(tabB.received).toEqual([]);
  });
});
