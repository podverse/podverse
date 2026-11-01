import { Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type ProfileIdentityProps = {
  /** Trimmed bio. Omitted when the profile has none. */
  bio: string | null;
  /** In-body display name. Omit when the title bar already shows it. */
  name?: string;
  testID: string;
};

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) => ({
  bio: {
    ...typography.prose,
    color: themeStyles.textSecondary.color,
  },
  identity: {
    gap: tokens.spacing.md,
  },
  name: {
    color: themeStyles.textPrimary.color,
    fontSize: 20,
    fontWeight: '700' as const,
  },
});

/**
 * Display name and bio above a profile's chips. The bio is secondary reading type, and
 * it is omitted when blank.
 */
export function ProfileIdentity({ bio, name, testID }: ProfileIdentityProps) {
  const styles = useThemedStyles(createStyles);
  const hasName = name !== undefined && name.length > 0;
  const hasBio = bio !== null && bio.length > 0;

  if (!hasName && !hasBio) {
    return null;
  }

  return (
    <View style={styles.identity}>
      {hasName ? (
        <Text accessibilityRole="header" style={styles.name}>
          {name}
        </Text>
      ) : null}
      {hasBio ? (
        <Text style={styles.bio} testID={testID}>
          {bio}
        </Text>
      ) : null}
    </View>
  );
}
