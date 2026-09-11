import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type AccordionProps = {
  title: string;
  children: ReactNode;
  testID: string;
  defaultOpen?: boolean;
};

/**
 * Collapsible section. One bordered card: slim title row when closed, children below the
 * title (still inside the card) when open. Title is a single line so collapsed height stays stable.
 */
export function Accordion({ title, children, testID, defaultOpen = false }: AccordionProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const [open, setOpen] = useState(defaultOpen);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        header: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.md,
          minHeight: 44,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.lg,
        },
        panel: {
          paddingBottom: tokens.spacing.lg,
          paddingHorizontal: tokens.spacing.lg,
        },
        shell: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          overflow: 'hidden',
        },
        title: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
          flex: 1,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.shell} testID={testID}>
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          setOpen((value) => !value);
        }}
        style={styles.header}
        testID={`${testID}-toggle`}
      >
        <Text numberOfLines={1} style={styles.title}>
          {title}
        </Text>
        <Ionicons
          accessibilityElementsHidden
          color={themeStyles.textPrimary.color}
          importantForAccessibility="no"
          name={open ? 'chevron-up' : 'chevron-down'}
          size={20}
        />
      </Pressable>
      {open ? <View style={styles.panel}>{children}</View> : null}
    </View>
  );
}
