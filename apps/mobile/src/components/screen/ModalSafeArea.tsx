import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { useTheme } from '../../theme/useTheme';

export type ModalSafeAreaProps = {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

/**
 * Full-screen `Modal` content. A Modal is a new native window, so insets from the app-root
 * `SafeAreaProvider` do not apply. This remounts the provider and insets all four edges so the
 * status bar, home indicator, and notches stay clear.
 */
export function ModalSafeArea({ children, style, testID }: ModalSafeAreaProps) {
  const { styles: themeStyles } = useTheme();

  return (
    <SafeAreaProvider>
      <SafeAreaView
        style={[styles.root, { backgroundColor: themeStyles.screen.backgroundColor }, style]}
        testID={testID}
      >
        {children}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
