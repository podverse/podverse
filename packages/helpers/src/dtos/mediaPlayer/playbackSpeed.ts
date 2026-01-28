export type PlaybackSpeedValue =
  | 0.5
  | 0.75
  | 0.87
  | 1.0
  | 1.12
  | 1.25
  | 1.5
  | 1.75
  | 2.0
  | 2.5
  | 3.0;

export type PlaybackSpeedTranslationKey =
  | '0-5'
  | '0-75'
  | '0-87'
  | '1-0'
  | '1-12'
  | '1-25'
  | '1-5'
  | '1-75'
  | '2-0'
  | '2-5'
  | '3-0';

export function getNextPlaybackSpeed(current: PlaybackSpeedValue): PlaybackSpeedValue {
  const speeds: PlaybackSpeedValue[] = [0.5, 0.75, 0.87, 1.0, 1.12, 1.25, 1.5, 1.75, 2.0, 2.5, 3.0];
  const idx = speeds.indexOf(current);
  return speeds[(idx + 1) % speeds.length] ?? 1.0;
}

export function getPlaybackTranslationKey(speed: PlaybackSpeedValue): PlaybackSpeedTranslationKey {
  switch (speed) {
    case 0.5:
      return '0-5';
    case 0.75:
      return '0-75';
    case 0.87:
      return '0-87';
    case 1.0:
      return '1-0';
    case 1.12:
      return '1-12';
    case 1.25:
      return '1-25';
    case 1.5:
      return '1-5';
    case 1.75:
      return '1-75';
    case 2.0:
      return '2-0';
    case 2.5:
      return '2-5';
    case 3.0:
      return '3-0';
    default:
      return '1-0';
  }
}
