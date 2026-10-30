import { describe, expect, it } from 'vitest';

import type { PlaybackDeviceListEntry } from '@podverse/helpers';

import { buildPlaybackDeviceMenuEntries } from './playbackDeviceMenu';

const THIS_SESSION = 'session-this';
const OTHER_SESSION = 'session-other';
const THIRD_SESSION = 'session-third';

function entry(params: {
  sessionIdText: string;
  isThisDevice?: boolean;
  isActive?: boolean;
}): PlaybackDeviceListEntry {
  return {
    device: {
      session_id_text: params.sessionIdText,
      client_type: 'web',
      device_label: params.sessionIdText,
      session_created_at: '2026-01-01T00:00:00.000Z',
    },
    isThisDevice: params.isThisDevice === true,
    isActive: params.isActive === true,
    sameLabelNumber: null,
  };
}

describe('buildPlaybackDeviceMenuEntries', () => {
  it('marks this device and leaves the playing device in place', () => {
    const menu = buildPlaybackDeviceMenuEntries({
      entries: [
        entry({ sessionIdText: THIS_SESSION, isThisDevice: true }),
        entry({ sessionIdText: OTHER_SESSION, isActive: true }),
      ],
      role: 'remote',
      thisTabHoldsAudio: false,
      pendingTransferTargetSessionIdText: null,
    });

    expect(menu[0]).toMatchObject({
      descriptionParts: ['this_device'],
      checked: false,
      transferTargetSessionIdText: THIS_SESSION,
    });
    expect(menu[1]).toMatchObject({
      descriptionParts: ['playing'],
      checked: true,
      transferTargetSessionIdText: null,
    });
  });

  it('offers a take over when another tab of this device is playing', () => {
    const menu = buildPlaybackDeviceMenuEntries({
      entries: [entry({ sessionIdText: THIS_SESSION, isThisDevice: true, isActive: true })],
      role: 'remote',
      thisTabHoldsAudio: false,
      pendingTransferTargetSessionIdText: null,
    });

    expect(menu[0]).toMatchObject({
      descriptionParts: ['this_device', 'playing_in_another_tab'],
      checked: true,
      transferTargetSessionIdText: THIS_SESSION,
    });
  });

  it('does not mark this device as playing when this tab is idle and this session is the active one', () => {
    const menu = buildPlaybackDeviceMenuEntries({
      entries: [
        entry({ sessionIdText: THIS_SESSION, isThisDevice: true, isActive: true }),
        entry({ sessionIdText: OTHER_SESSION }),
      ],
      role: 'idle',
      thisTabHoldsAudio: false,
      pendingTransferTargetSessionIdText: null,
    });

    expect(menu[0]).toMatchObject({
      descriptionParts: ['this_device'],
      transferTargetSessionIdText: THIS_SESSION,
    });
  });

  it('does nothing when this tab already holds the audio', () => {
    const menu = buildPlaybackDeviceMenuEntries({
      entries: [entry({ sessionIdText: THIS_SESSION, isThisDevice: true, isActive: true })],
      role: 'active',
      thisTabHoldsAudio: true,
      pendingTransferTargetSessionIdText: null,
    });

    expect(menu[0]?.transferTargetSessionIdText).toBeNull();
  });

  it('marks a pending transfer target as sending and keeps its target', () => {
    const menu = buildPlaybackDeviceMenuEntries({
      entries: [
        entry({ sessionIdText: THIS_SESSION, isThisDevice: true }),
        entry({ sessionIdText: OTHER_SESSION, isActive: true }),
        entry({ sessionIdText: THIRD_SESSION }),
      ],
      role: 'remote',
      thisTabHoldsAudio: false,
      pendingTransferTargetSessionIdText: THIRD_SESSION,
    });

    expect(menu[2]).toMatchObject({
      descriptionParts: ['sending'],
      checked: false,
      transferTargetSessionIdText: THIRD_SESSION,
    });
  });

  it('gives every device its own target when none is playing', () => {
    const menu = buildPlaybackDeviceMenuEntries({
      entries: [
        entry({ sessionIdText: THIS_SESSION, isThisDevice: true }),
        entry({ sessionIdText: OTHER_SESSION }),
      ],
      role: 'idle',
      thisTabHoldsAudio: false,
      pendingTransferTargetSessionIdText: null,
    });

    expect(menu.every((item) => item.checked === false)).toBe(true);
    expect(menu.map((item) => item.transferTargetSessionIdText)).toEqual([
      THIS_SESSION,
      OTHER_SESSION,
    ]);
  });
});
