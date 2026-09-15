import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import type { GestureResponderEvent } from 'react-native';

import type { PlaybackTransportState } from '../../playback/playbackTransport';
import { LIST_ROW_PLAY_ICON_SIZE } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import type { ButtonSize } from '../primitives/Button';
import { Button } from '../primitives/Button';

type PlayerTransportButtonProps = {
  onPause: (event: GestureResponderEvent) => void;
  onPlay: (event: GestureResponderEvent) => void;
  onRetry: (event: GestureResponderEvent) => void;
  size?: ButtonSize;
  state: PlaybackTransportState;
  testID: string;
};

const iconName = (
  state: PlaybackTransportState
): ComponentProps<typeof Ionicons>['name'] | null => {
  switch (state) {
    case 'error':
      return 'alert-circle';
    case 'loading':
      return null;
    case 'paused':
      return 'play';
    case 'playing':
      return 'pause';
  }
};

/**
 * Play / pause / loading / retry control for the mini player and full player only.
 *
 * List rows and detail screens use `MediaRowActions` play/pause and must not mount this — a
 * spinner or error icon on every row would fight the player chrome that already owns that state.
 */
export function PlayerTransportButton({
  onPause,
  onPlay,
  onRetry,
  size = 'sm',
  state,
  testID,
}: PlayerTransportButtonProps) {
  const { t } = useTranslation();
  const { styles: themeStyles } = useTheme();
  const iconColor =
    state === 'error' ? themeStyles.buttonDanger.color : themeStyles.buttonPrimary.color;

  const label =
    state === 'error'
      ? t('misc.try_again')
      : state === 'loading'
        ? t('misc.loading')
        : state === 'playing'
          ? t('media_player.pause')
          : t('media_player.play');

  const glyph = iconName(state);
  const iconSize = size === 'lg' ? 22 : LIST_ROW_PLAY_ICON_SIZE;

  const handlePress = (event: GestureResponderEvent) => {
    if (state === 'error') {
      onRetry(event);
      return;
    }
    if (state === 'playing') {
      onPause(event);
      return;
    }
    if (state === 'paused') {
      onPlay(event);
    }
  };

  return (
    <Button
      accessibilityLabel={label}
      icon={
        glyph !== null ? (
          <Ionicons color={iconColor} name={glyph} size={iconSize} />
        ) : undefined
      }
      iconOnly
      label={label}
      loading={state === 'loading'}
      onPress={handlePress}
      size={size}
      testID={testID}
      variant={state === 'error' ? 'danger' : 'primary'}
    />
  );
}
