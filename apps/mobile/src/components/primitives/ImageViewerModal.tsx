import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Modal, StyleSheet, View } from 'react-native';

import { shareRemoteFile } from '../../lib/share/shareRemoteFile';
import { useTheme } from '../../theme/useTheme';
import { HeaderBarAction } from '../screen/HeaderBarAction';
import { HeaderBarChrome } from '../screen/HeaderBarChrome';
import { MoreMenu } from './MoreMenu';

export type ImageViewerModalProps = {
  accessibilityLabel: string;
  onClose: () => void;
  uri: string;
  visible: boolean;
};

/**
 * Portrait full-screen image. The painted window is the frame: the image is full width and
 * contained, not cropped. More opens `MoreMenu`; Download hands the file to the OS share sheet.
 */
export function ImageViewerModal({
  accessibilityLabel,
  onClose,
  uri,
  visible,
}: ImageViewerModalProps) {
  const { t } = useTranslation();
  const { styles: themeStyles } = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const styles = useMemo(
    () =>
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
      }),
    [themeStyles]
  );

  const handleDownload = useCallback(() => {
    void shareRemoteFile(uri);
  }, [uri]);

  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['portrait']}
      visible={visible}
    >
      <View style={styles.root} testID="image-viewer">
        <HeaderBarChrome
          backAccessibilityLabel={t('misc.go_back')}
          backTestID="image-viewer-back"
          onBack={onClose}
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
            resizeMode="contain"
            source={{ uri }}
            style={styles.image}
          />
        </View>
        <MoreMenu
          cancelLabel={t('misc.cancel')}
          onCancel={() => {
            setIsMenuOpen(false);
          }}
          sections={[
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
          ]}
          testID="image-viewer-menu"
          visible={isMenuOpen}
        />
      </View>
    </Modal>
  );
}
