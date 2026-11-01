import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Image } from 'expo-image';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Platform, StyleSheet, View } from 'react-native';

import type { MoreMenuSection } from '../../components/primitives/MoreMenu';
import { MoreMenu } from '../../components/primitives/MoreMenu';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { useAddByRssArtworkHeaders } from '../../hooks/useAddByRssArtworkHeaders';
import { shareRemoteFile } from '../../lib/share/shareRemoteFile';
import { SlideUpDismissGesture } from '../../navigation/SlideUpDismissGesture';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

type ImageViewerScreenParams = {
  accessibilityLabel: string;
  /** Feed URL for protected add-by-RSS artwork. Never an `Authorization` value. */
  addByRssFeedUrl?: string;
  uri: string;
};

type ImageViewerStackParamList = {
  ImageViewer: ImageViewerScreenParams;
};

type ImageViewerScreenProps = NativeStackScreenProps<ImageViewerStackParamList, 'ImageViewer'>;

const createStyles = ({ styles: themeStyles }: ThemedStylesTheme) =>
  StyleSheet.create({
    body: {
      alignItems: 'center',
      backgroundColor: themeStyles.screen.backgroundColor,
      flex: 1,
      justifyContent: 'center',
    },
    image: {
      height: '100%',
      width: '100%',
    },
    root: {
      backgroundColor: themeStyles.screen.backgroundColor,
      flex: 1,
    },
  });

/**
 * Portrait full-screen image on the root stack. The painted window is the frame: the image is
 * full width and contained, not cropped. More opens `MoreMenu`. Download hands the file to the
 * OS share sheet when the file can be fetched by URL alone.
 */
export function ImageViewerScreen({ navigation, route }: ImageViewerScreenProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { accessibilityLabel, addByRssFeedUrl, uri } = route.params;
  const artworkHeaders = useAddByRssArtworkHeaders(addByRssFeedUrl ?? null, uri);

  const handleDownload = useCallback(() => {
    void shareRemoteFile(uri);
  }, [uri]);

  // `shareRemoteFile` fetches by URL and cannot attach `Authorization`. Offering Download for
  // protected artwork would fail, so that action stays off the menu when headers are required.
  const menuSections = useMemo((): MoreMenuSection[] => {
    if (artworkHeaders !== undefined) {
      return [];
    }
    return [
      {
        items: [
          {
            key: 'download',
            label: t('media.download_image'),
            onPress: handleDownload,
          },
        ],
        key: 'actions',
      },
    ];
  }, [artworkHeaders, handleDownload, t]);

  const dismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <SlideUpDismissGesture enabled={Platform.OS === 'android'} onDismiss={dismiss}>
      <View style={styles.root} testID="image-viewer">
        <HeaderBarChrome
          backAccessibilityLabel={t('misc.dismiss')}
          backIcon="chevron-down"
          backTestID="image-viewer-back"
          onBack={dismiss}
          right={
            <HeaderBarAction
              accessibilityLabel={t('media.more_options')}
              icon="ellipsis-horizontal"
              onPress={() => {
                setIsMenuOpen(true);
              }}
              testID="image-viewer-more"
            />
          }
          title={t('media.image')}
        />
        <View style={styles.body}>
          <Image
            accessibilityIgnoresInvertColors
            accessibilityLabel={accessibilityLabel}
            accessibilityRole="image"
            accessible
            contentFit="contain"
            key={artworkHeaders === undefined ? 'plain' : 'authorized'}
            source={
              artworkHeaders === undefined
                ? { uri }
                : { cacheKey: `${uri}\u0000auth`, headers: artworkHeaders, uri }
            }
            style={styles.image}
          />
        </View>
        <MoreMenu
          cancelLabel={t('misc.cancel')}
          onCancel={() => {
            setIsMenuOpen(false);
          }}
          sections={menuSections}
          testID="image-viewer-menu"
          visible={isMenuOpen}
        />
      </View>
    </SlideUpDismissGesture>
  );
}
