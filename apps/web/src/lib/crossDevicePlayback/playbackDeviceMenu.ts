import type { PlaybackDeviceListEntry, PlaybackRole } from '@podverse/helpers';

export type PlaybackDeviceMenuDescriptionPart =
  'this_device' | 'sending' | 'playing_in_another_tab' | 'playing';

export type PlaybackDeviceMenuEntry = {
  entry: PlaybackDeviceListEntry;
  descriptionParts: PlaybackDeviceMenuDescriptionPart[];
  checked: boolean;
  /** Session to pass to `transferTo`, or null when choosing it does nothing. */
  transferTargetSessionIdText: string | null;
};

function descriptionParts(
  entry: PlaybackDeviceListEntry,
  role: PlaybackRole,
  pendingTransferTargetSessionIdText: string | null
): PlaybackDeviceMenuDescriptionPart[] {
  const parts: PlaybackDeviceMenuDescriptionPart[] = [];
  if (entry.isThisDevice) {
    parts.push('this_device');
  }
  if (
    pendingTransferTargetSessionIdText !== null &&
    entry.device.session_id_text === pendingTransferTargetSessionIdText
  ) {
    parts.push('sending');
    return parts;
  }
  if (entry.isActive && !(entry.isThisDevice && role === 'idle')) {
    parts.push(entry.isThisDevice && role === 'remote' ? 'playing_in_another_tab' : 'playing');
  }
  return parts;
}

/**
 * Another device that is already playing is left alone. This device is left alone only while this
 * tab holds the audio; otherwise choosing it takes over here, including from another tab.
 */
function transferTargetSessionIdText(
  entry: PlaybackDeviceListEntry,
  role: PlaybackRole,
  thisTabHoldsAudio: boolean
): string | null {
  if (entry.isThisDevice) {
    if (role === 'active' && thisTabHoldsAudio) {
      return null;
    }
    return entry.device.session_id_text;
  }
  if (entry.isActive) {
    return null;
  }
  return entry.device.session_id_text;
}

export function buildPlaybackDeviceMenuEntries(params: {
  entries: readonly PlaybackDeviceListEntry[];
  role: PlaybackRole;
  thisTabHoldsAudio: boolean;
  pendingTransferTargetSessionIdText: string | null;
}): PlaybackDeviceMenuEntry[] {
  return params.entries.map((entry) => ({
    entry,
    descriptionParts: descriptionParts(
      entry,
      params.role,
      params.pendingTransferTargetSessionIdText
    ),
    checked: entry.isActive,
    transferTargetSessionIdText: transferTargetSessionIdText(
      entry,
      params.role,
      params.thisTabHoldsAudio
    ),
  }));
}
