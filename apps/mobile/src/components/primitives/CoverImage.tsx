import { Image } from 'expo-image';
import { memo, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { GestureResponderEvent, ImageStyle, StyleProp, ViewStyle } from 'react-native';
import { Pressable, StyleSheet, View } from 'react-native';

import placeholderArtwork from '../../../assets/images/placeholder-image.png';
import { isShareSheetPassthroughWindow } from '../../lib/share/shareSheetPassthrough';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import type { CoverImageTapPoint } from './coverImageTap';
import { isDeliberateCoverImageTap } from './coverImageTap';
import { ImageViewerModal } from './ImageViewerModal';

/** Overlay fade, plus a beat so dismiss finishes before this node leaves the tree. */
const IMAGE_VIEWER_UNMOUNT_DELAY_MS = 350;

/**
 * Missing-artwork bitmap, the same file web serves as `/images/placeholder-image.png`.
 * Shown when there is no URI or the remote file fails. Not painted behind a URI that is
 * already set — that would flash this icon while a known cover decodes.
 */
const placeholderSource = typeof placeholderArtwork === 'number' ? placeholderArtwork : null;

const createStyles = ({ styles: themeStyles }: ThemedStylesTheme) =>
  StyleSheet.create({
    placeholderFrame: {
      borderColor: themeStyles.border.borderColor,
      borderWidth: 1,
      overflow: 'hidden',
    },
    viewerHit: {
      overflow: 'hidden',
    },
  });

/**
 * Sizing lands on the artwork itself or, when there is no URI, on the fallback frame that stands
 * in for it, so it has to satisfy both an `Image` and a `View`.
 */
type CoverImageStyle = ImageStyle & ViewStyle;

export type CoverImageProps = {
  uri: string | null | undefined;
  /**
   * Largest-original URL for the full-screen viewer. When omitted, the viewer uses `uri`.
   */
  viewerUri?: string | null;
  accessibilityLabel?: string;
  /**
   * When true (default) and `uri` is set, a stationary tap opens the full-screen image viewer.
   * A press that moves (scroll or drag) does not. Set false when this image sits inside a
   * pressable row, cell, or header. The placeholder bitmap never opens the viewer.
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
 * Standalone art opens the image viewer on a stationary tap; pass `opensViewer={false}` when the
 * parent is the control. The viewer stays out of the tree until that tap, and unmounts after its
 * fade, so a system share sheet cannot present it as a side effect.
 *
 * Uses expo-image with memory+disk cache so a list decode can be reused on a compact header
 * without a second network round-trip. A missing or failed URI shows the bundled placeholder.
 */
export const CoverImage = memo(function CoverImage({
  accessibilityLabel,
  opensViewer = true,
  style,
  testID,
  uri,
  viewerUri,
}: CoverImageProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [isViewerMounted, setIsViewerMounted] = useState(false);
  const [failedUri, setFailedUri] = useState<string | null>(null);
  const tapStartRef = useRef<CoverImageTapPoint | null>(null);
  const tapMovedRef = useRef(false);

  useEffect(() => {
    if (isViewerOpen) {
      setIsViewerMounted(true);
      return;
    }
    if (!isViewerMounted) {
      return;
    }
    const handle = setTimeout(() => {
      setIsViewerMounted(false);
    }, IMAGE_VIEWER_UNMOUNT_DELAY_MS);
    return () => {
      clearTimeout(handle);
    };
  }, [isViewerMounted, isViewerOpen]);

  const pointFromEvent = (event: GestureResponderEvent): CoverImageTapPoint => {
    return { x: event.nativeEvent.pageX, y: event.nativeEvent.pageY };
  };

  const resolvedLabel = accessibilityLabel ?? t('media.image');
  const displayUri = uri !== null && uri !== undefined && uri.length > 0 ? uri : null;
  const resolvedViewerUri =
    viewerUri !== null && viewerUri !== undefined && viewerUri.length > 0 ? viewerUri : displayUri;

  const viewer =
    isViewerMounted && resolvedViewerUri !== null ? (
      <ImageViewerModal
        accessibilityLabel={resolvedLabel}
        onClose={() => {
          setIsViewerOpen(false);
        }}
        uri={resolvedViewerUri}
        visible={isViewerOpen}
      />
    ) : null;

  if (displayUri === null || failedUri === displayUri) {
    return (
      <>
        <View
          accessibilityElementsHidden={!opensViewer}
          accessibilityLabel={opensViewer ? resolvedLabel : undefined}
          accessibilityRole={opensViewer ? 'image' : undefined}
          importantForAccessibility={opensViewer ? 'yes' : 'no'}
          style={[styles.placeholderFrame, style]}
          testID={testID}
        >
          <Image
            accessibilityElementsHidden
            accessibilityIgnoresInvertColors
            contentFit="contain"
            importantForAccessibility="no"
            source={placeholderSource}
            style={StyleSheet.absoluteFill}
          />
        </View>
        {viewer}
      </>
    );
  }

  // Artwork inside a parent Pressable (row / grid cell) is decorative: the parent owns the
  // accessible name. Standalone covers hide the Image too — the outer Pressable speaks for it.
  // No placeholder behind a known URI — that flashes the fallback icon while the bitmap paints
  // (worse on slow Android decode).
  const image = (imageStyle: StyleProp<CoverImageStyle>) => (
    <Image
      accessibilityElementsHidden
      accessibilityIgnoresInvertColors
      cachePolicy="memory-disk"
      contentFit="cover"
      importantForAccessibility="no"
      onError={() => {
        setFailedUri(displayUri);
      }}
      recyclingKey={displayUri}
      source={{ uri: displayUri }}
      style={imageStyle}
      testID={opensViewer ? undefined : testID}
      transition={0}
    />
  );

  if (!opensViewer) {
    return image(style);
  }

  return (
    <>
      <Pressable
        accessibilityHint={t('media.view_full_image')}
        accessibilityLabel={resolvedLabel}
        accessibilityRole="button"
        onPress={(event) => {
          if (isShareSheetPassthroughWindow()) {
            return;
          }
          const stayedPut =
            !tapMovedRef.current &&
            isDeliberateCoverImageTap(tapStartRef.current, pointFromEvent(event));
          if (!stayedPut) {
            return;
          }
          setIsViewerOpen(true);
        }}
        onPressIn={(event) => {
          tapStartRef.current = pointFromEvent(event);
          tapMovedRef.current = false;
        }}
        onTouchMove={(event) => {
          if (!isDeliberateCoverImageTap(tapStartRef.current, pointFromEvent(event))) {
            tapMovedRef.current = true;
          }
        }}
        style={[styles.viewerHit, style]}
        testID={testID}
      >
        {image(StyleSheet.absoluteFill)}
      </Pressable>
      {viewer}
    </>
  );
});
