import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type AccordionProps = {
  title: string;
  /** Quiet line under the title, inside the header. Caption type. */
  subtitle?: string;
  children: ReactNode;
  testID: string;
  defaultOpen?: boolean;
  onToggle?: (open: boolean) => void;
};

/**
 * Collapsible section. One bordered card: title row when closed, children below the title
 * (still inside the card) when open. The title stays one line. An optional subtitle sits under
 * it in caption type.
 */
export function Accordion({
  title,
  subtitle,
  children,
  testID,
  defaultOpen = false,
  onToggle,
}: AccordionProps) {
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
        subtitle: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
        },
        title: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
          fontWeight: '400',
        },
        titleBlock: {
          flex: 1,
          gap: tokens.spacing.xs,
        },
      }),
    [themeStyles, tokens]
  );

  const headerLabel = subtitle !== undefined && subtitle !== '' ? `${title}. ${subtitle}` : title;

  return (
    <View style={styles.shell} testID={testID}>
      <Pressable
        accessibilityLabel={headerLabel}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={() => {
          setOpen((value) => {
            const next = !value;
            onToggle?.(next);
            return next;
          });
        }}
        style={styles.header}
        testID={`${testID}-toggle`}
      >
        <View style={styles.titleBlock}>
          <Text numberOfLines={1} style={styles.title}>
            {title}
          </Text>
          {subtitle !== undefined && subtitle !== '' ? (
            <Text style={styles.subtitle}>{subtitle}</Text>
          ) : null}
        </View>
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
