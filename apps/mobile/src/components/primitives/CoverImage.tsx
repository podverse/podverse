import { Image } from 'expo-image';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { ImageViewerModal } from './ImageViewerModal';

/**
 * Sizing lands on the artwork itself or, when there is no URI, on the fallback box that stands in
 * for it, so it has to satisfy both an `Image` and a `View`.
 */
type CoverImageStyle = ImageStyle & ViewStyle;

export type CoverImageProps = {
  uri: string | null | undefined;
  /**
   * Largest-original URL for the full-screen viewer. When omitted, the viewer uses `uri`.
   */
  viewerUri?: string | null;
  /** Shown when `uri` is missing. Caller localizes. */
  fallbackLabel?: string;
  accessibilityLabel?: string;
  /**
   * When true (default) and `uri` is set, tapping opens the full-screen image viewer.
   * Set false when this image sits inside a pressable row, cell, or header.
   */
  opensViewer?: boolean;
  style?: StyleProp<CoverImageStyle>;
  testID?: string;
};

/**
 * Warm the memory+disk cache for a list-size artwork URL. Fire-and-forget — never await before
 * navigate. Safe to call with null/empty.
 */
export const prefetchCoverImage = (uri: string | null | undefined): void => {
  if (uri === null || uri === undefined || uri.length === 0) {
    return;
  }
  void Image.prefetch(uri);
};

/**
 * Square cover / artwork. Podcast, episode, and album art stay square — do not pass a
 * `borderRadius` unless a specific surface (for example a circular avatar) needs one.
 * Standalone art opens the image viewer; pass `opensViewer={false}` when the parent is the control.
 *
 * Uses expo-image with memory+disk cache so a list decode can be reused on a compact header
 * without a second network round-trip.
 */
export function CoverImage({
  accessibilityLabel,
  fallbackLabel,
  opensViewer = true,
  style,
  testID,
  uri,
  viewerUri,
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
      }),
    [themeStyles, tokens]
  );

  const resolvedLabel = accessibilityLabel ?? t('media.image');

  if (uri === null || uri === undefined || uri.length === 0) {
    return (
      <View
        accessibilityElementsHidden={!opensViewer}
        importantForAccessibility={opensViewer ? 'yes' : 'no'}
        style={[styles.fallback, style]}
        testID={testID}
      >
        {fallbackLabel !== undefined ? (
          <Text numberOfLines={3} style={styles.fallbackText}>
            {fallbackLabel}
          </Text>
        ) : null}
      </View>
    );
  }

  // Artwork inside a parent Pressable (row / grid cell) is decorative: the parent owns the
  // accessible name. Standalone covers hide the Image too — the outer Pressable speaks for it.
  // No secondary fill behind a known URI — that reads as an empty placeholder while the bitmap
  // paints (worse on slow Android decode).
  const image = (
    <Image
      accessibilityElementsHidden
      accessibilityIgnoresInvertColors
      cachePolicy="memory-disk"
      contentFit="cover"
      importantForAccessibility="no"
      recyclingKey={uri}
      source={{ uri }}
      style={style}
      testID={opensViewer ? undefined : testID}
      transition={0}
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
        uri={
          viewerUri !== null && viewerUri !== undefined && viewerUri.length > 0 ? viewerUri : uri
        }
        visible={isViewerOpen}
      />
    </>
  );
}
