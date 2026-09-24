import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Card } from '../primitives/Card';
import { SectionHeading } from '../section/SectionHeading';

export type SettingsGroupProps = {
  children: ReactNode;
  /** Already-localized section title shown above the card. */
  title: string;
  /** When true, adds space above this group so it sits below the previous one. */
  spaced?: boolean;
  testID?: string;
};

const createStyles = ({ tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    section: {
      gap: tokens.spacing.lg,
    },
    sectionSpaced: {
      marginTop: tokens.spacing.xl,
    },
  });

/**
 * Channel / hub settings group: a section heading above an unpadded card. Callers put switch
 * and action rows inside the card; horizontal inset belongs on those rows so hairlines span the
 * full card width.
 */
export function SettingsGroup({ children, spaced = false, testID, title }: SettingsGroupProps) {
  const styles = useThemedStyles(createStyles);

  return (
    <View style={[styles.section, spaced ? styles.sectionSpaced : null]} testID={testID}>
      <SectionHeading>{title}</SectionHeading>
      <Card padded={false}>{children}</Card>
    </View>
  );
}
