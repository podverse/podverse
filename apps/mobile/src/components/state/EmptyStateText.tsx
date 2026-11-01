import { Text, View } from 'react-native';

import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

/** 1.5rem, the web empty-banner size. */
const EMPTY_STATE_FONT_SIZE = 24;

/** 24 × 1.35, the shared text line height. */
const EMPTY_STATE_LINE_HEIGHT = 32;

type EmptyStateTextProps = {
  /** Already localized. */
  message: string;
  testID?: string;
};

const createEmptyStateTextStyles = (theme: ThemedStylesTheme) => ({
  message: {
    color: theme.styles.textPrimary.color,
    fontSize: EMPTY_STATE_FONT_SIZE,
    fontWeight: '300' as const,
    lineHeight: EMPTY_STATE_LINE_HEIGHT,
  },
  root: {
    alignSelf: 'stretch' as const,
    backgroundColor: theme.tokens.background.glow,
    padding: theme.tokens.spacing.lg,
    width: '100%' as const,
  },
});

/**
 * Empty-list copy on the glow fill. Callers pass a localized sentence. An action, when there
 * is one, stays outside this banner.
 */
export function EmptyStateText({ message, testID }: EmptyStateTextProps) {
  const styles = useThemedStyles(createEmptyStateTextStyles);

  return (
    <View style={styles.root} testID={testID}>
      <Text accessibilityRole="text" style={styles.message}>
        {message}
      </Text>
    </View>
  );
}
