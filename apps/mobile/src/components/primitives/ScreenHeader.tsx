import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type ScreenHeaderProps = {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  testID?: string;
};

/**
 * Themed screen title block: display-scale title, optional subtitle, and an optional actions slot.
 * Copy is passed in by the caller (i18n owned upstream); colors/spacing come from theme tokens.
 */
export function ScreenHeader({ title, subtitle, actions, testID }: ScreenHeaderProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          marginTop: tokens.spacing.md,
        },
        container: {
          marginBottom: tokens.spacing.md,
        },
        subtitle: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.xs,
        },
        title: {
          ...typography.display,
          color: themeStyles.textPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.container} testID={testID}>
      <Text style={styles.title}>{title}</Text>
      {subtitle !== undefined ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {actions !== undefined ? <View style={styles.actions}>{actions}</View> : null}
    </View>
  );
}
