import { Ionicons } from '@expo/vector-icons';
import type { ComponentProps } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet } from 'react-native';

import type { DTOItem } from '@podverse/helpers/dto';

import type { DownloadStatus } from '../../downloads/downloadTypes';
import { useDownloadAction } from '../../downloads/useDownloads';
import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { LIST_ROW_ACTION_ICON_SIZE, LIST_ROW_ACTION_SIZE } from '../../theme/screenLayout';
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
    case 'paused':
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
      return 'trash-outline';
    case 'failed':
      return 'alert-circle-outline';
    case 'cancelled':
    case 'downloading':
    case 'queued':
    case 'paused':
    case null:
      return 'download-outline';
  }
};

/**
 * The download affordance as a list row carries it: one icon, one tap, no detour through the
 * episode screen. **Renders nothing** when the item cannot be downloaded — a livestream, an
 * HLS-only source, or no enclosure — which is the same rule the labeled control on episode detail
 * applies, read from the same eligibility check.
 *
 * Hit target matches {@link LIST_ROW_ACTION_SIZE} (same as Play / More) so icon controls share one
 * finger target. The glyph itself is borderless and uses {@link LIST_ROW_ACTION_ICON_SIZE} — the
 * same optical size as More — so trash and download do not look smaller than the ellipsis.
 *
 * The busy state is a spinner with no percentage, and the row does not subscribe to byte progress.
 * A screen can show forty of these at once, and per-chunk work multiplied by forty rows is what
 * makes a list stutter while something downloads. Episode detail and My Library → Downloads are
 * where a user goes for the number; both report it and announce it.
 */
export function DownloadRowControl({ item, testID }: DownloadRowControlProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { isDownloadable, remove, start, status } = useDownloadAction(item);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        control: {
          alignItems: 'center',
          height: LIST_ROW_ACTION_SIZE,
          justifyContent: 'center',
          width: LIST_ROW_ACTION_SIZE,
        },
        pressed: {
          opacity: 0.7,
        },
      }),
    []
  );

  if (!isDownloadable) {
    return null;
  }

  const isInProgress = status === 'queued' || status === 'downloading' || status === 'paused';
  const iconColor = status === 'failed' ? tokens.text.danger : tokens.button.secondaryColor;

  return (
    <Pressable
      accessibilityLabel={t(actionLabelKey(status))}
      accessibilityRole="button"
      accessibilityState={{ busy: isInProgress }}
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
        <Ionicons
          color={iconColor}
          name={statusIconName(status)}
          size={LIST_ROW_ACTION_ICON_SIZE}
        />
      )}
    </Pressable>
  );
}
