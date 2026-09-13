import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import type { DTOItem } from '@podverse/helpers/dto';

import type { DownloadStatus } from '../../downloads/downloadTypes';
import { useDownloadAction } from '../../downloads/useDownloads';
import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { useTheme } from '../../theme/useTheme';

type DownloadRowControlProps = {
  item: DTOItem;
  testID: string;
};

/** What a tap does next, which is not always "download" — exhaustive so a new status must answer. */
const actionLabelKey = (status: DownloadStatus | null): string => {
  switch (status) {
    case 'complete':
      return 'features.download.remove_download';
    case 'queued':
    case 'downloading':
      return 'features.download.cancel_download';
    case 'failed':
      return 'features.download.episode_download_error';
    case 'cancelled':
    case null:
      return 'features.download.download_episode';
  }
};

const statusIconName = (status: DownloadStatus | null): ComponentProps<typeof Ionicons>['name'] => {
  switch (status) {
    case 'complete':
      return 'checkmark-circle';
    case 'failed':
      return 'alert-circle-outline';
    case 'cancelled':
    case 'downloading':
    case 'queued':
    case null:
      return 'arrow-down-circle-outline';
  }
};

const styles = StyleSheet.create({
  control: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
    minWidth: 44,
  },
  pressed: {
    opacity: 0.7,
  },
});

/**
 * The download affordance as a list row carries it: one icon, one tap, no detour through the
 * episode screen. **Renders nothing** when the item cannot be downloaded — a livestream, an
 * HLS-only source, or no enclosure — which is the same rule the labeled control on episode detail
 * applies, read from the same eligibility check.
 *
 * The icon states what the item is and the label states what the tap does, because a download
 * already underway is cancelled from here and a finished one is removed.
 */
export function DownloadRowControl({ item, testID }: DownloadRowControlProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { isDownloadable, percentComplete, remove, start, status } = useDownloadAction(item);

  if (!isDownloadable) {
    return null;
  }

  const isInProgress = status === 'queued' || status === 'downloading';
  const iconColor = status === 'failed' ? tokens.text.danger : tokens.text.accent;

  return (
    <Pressable
      accessibilityLabel={t(actionLabelKey(status))}
      accessibilityRole="button"
      accessibilityState={{ busy: isInProgress }}
      accessibilityValue={
        isInProgress && percentComplete !== null
          ? { max: 100, min: 0, now: percentComplete }
          : undefined
      }
      hitSlop={8}
      onPress={(event) => {
        stopPropagation(event);
        if (status === 'complete' || isInProgress) {
          remove();
          return;
        }
        start();
      }}
      style={({ pressed }) => [styles.control, pressed ? styles.pressed : null]}
      testID={testID}
    >
      {isInProgress ? (
        <ActivityIndicator color={tokens.text.secondary} size="small" />
      ) : (
        <Ionicons color={iconColor} name={statusIconName(status)} size={22} />
      )}
    </Pressable>
  );
}
