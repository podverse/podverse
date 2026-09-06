import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageStyle, StyleProp } from 'react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { ImageViewerModal } from './ImageViewerModal';

export type CoverImageProps = {
  uri: string | null | undefined;
  /** Shown when `uri` is missing. Caller localizes. */
  fallbackLabel?: string;
  accessibilityLabel?: string;
  /**
   * When true (default) and `uri` is set, tapping opens the full-screen image viewer.
   * Set false when this image sits inside a pressable row, cell, or header.
   */
  opensViewer?: boolean;
  style?: StyleProp<ImageStyle>;
  testID?: string;
};

/**
 * Square cover / artwork. Podcast, episode, and album art stay square — do not pass a
 * `borderRadius` unless a specific surface (for example a circular avatar) needs one.
 * Standalone art opens the image viewer; pass `opensViewer={false}` when the parent is the control.
 */
export function CoverImage({
  accessibilityLabel,
  fallbackLabel,
  opensViewer = true,
  style,
  testID,
  uri,
}: CoverImageProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [isViewerOpen, setIsViewerOpen] = useState(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        fallback: {
          alignItems: 'center',
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderWidth: 1,
          justifyContent: 'center',
        },
        fallbackText: {
          color: themeStyles.textSecondary.color,
          fontSize: 11,
          fontWeight: '600',
          textAlign: 'center',
        },
        image: {
          backgroundColor: tokens.background.secondary,
        },
      }),
    [themeStyles, tokens]
  );

  const resolvedLabel = accessibilityLabel ?? t('media.image');

  if (uri === null || uri === undefined || uri.length === 0) {
    return (
      <View style={[styles.fallback, style]} testID={testID}>
        {fallbackLabel !== undefined ? (
          <Text numberOfLines={3} style={styles.fallbackText}>
            {fallbackLabel}
          </Text>
        ) : null}
      </View>
    );
  }

  const image = (
    <Image
      accessibilityElementsHidden={opensViewer}
      accessibilityIgnoresInvertColors
      accessibilityLabel={opensViewer ? undefined : accessibilityLabel}
      importantForAccessibility={opensViewer ? 'no' : undefined}
      source={{ uri }}
      style={[styles.image, style]}
      testID={opensViewer ? undefined : testID}
    />
  );

  if (!opensViewer) {
    return image;
  }

  return (
    <>
      <Pressable
        accessibilityHint={t('media.view_full_image')}
        accessibilityLabel={resolvedLabel}
        accessibilityRole="button"
        onPress={() => {
          setIsViewerOpen(true);
        }}
        testID={testID}
      >
        {image}
      </Pressable>
      <ImageViewerModal
        accessibilityLabel={resolvedLabel}
        onClose={() => {
          setIsViewerOpen(false);
        }}
        uri={uri}
        visible={isViewerOpen}
      />
    </>
  );
}
