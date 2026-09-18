import { useMemo } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/useTheme';
import { HeaderBarChrome } from '../screen/HeaderBarChrome';
import { LoadingSection } from '../state/LoadingSection';
import { RetryableError } from '../state/RetryableError';
import { CopyMarkdown } from './CopyMarkdown';

type ManagedCopyModalProps = {
  backAccessibilityLabel: string;
  backTestID: string;
  errorKey: string | null;
  isLoading: boolean;
  markdown: string | null;
  onClose: () => void;
  onRetry: () => void;
  testID: string;
  title: string;
  visible: boolean;
};

export function ManagedCopyModal({
  backAccessibilityLabel,
  backTestID,
  errorKey,
  isLoading,
  markdown,
  onClose,
  onRetry,
  testID,
  title,
  visible,
}: ManagedCopyModalProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const insets = useSafeAreaInsets();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        body: {
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
        },
        root: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
          paddingBottom: insets.bottom,
        },
      }),
    [insets.bottom, themeStyles, tokens.spacing.lg, tokens.spacing.md]
  );

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={visible}>
      <View style={styles.root} testID={testID}>
        <HeaderBarChrome
          backAccessibilityLabel={backAccessibilityLabel}
          backTestID={backTestID}
          onBack={onClose}
          title={title}
        />
        {isLoading ? <LoadingSection testID={`${testID}-loading`} /> : null}
        {!isLoading && (errorKey !== null || markdown === null) ? (
          <View style={styles.body}>
            <RetryableError
              errorKey={errorKey ?? 'errors.generic'}
              onRetry={onRetry}
              testID={`${testID}-error`}
            />
          </View>
        ) : null}
        {!isLoading && errorKey === null && markdown !== null ? (
          <ScrollView
            contentContainerStyle={styles.body}
            keyboardShouldPersistTaps="handled"
            style={{ flex: 1 }}
          >
            <CopyMarkdown markdown={markdown} />
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}
