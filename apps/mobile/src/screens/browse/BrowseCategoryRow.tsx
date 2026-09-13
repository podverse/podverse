import { Ionicons } from '@expo/vector-icons';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type BrowseCategoryRowProps = {
  expanded: boolean;
  hasChildren: boolean;
  indentDepth: number;
  onSelect: () => void;
  onToggleExpand: () => void;
  selected: boolean;
  testID: string;
  title: string;
};

/**
 * One directory category. The title selects the filter; a trailing chevron expands or collapses
 * nested children when the row is a top-level parent.
 */
export function BrowseCategoryRow({
  expanded,
  hasChildren,
  indentDepth,
  onSelect,
  onToggleExpand,
  selected,
  testID,
  title,
}: BrowseCategoryRowProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        indent: {
          width: indentDepth * tokens.spacing.lg,
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.md,
        },
        select: {
          alignItems: 'center',
          flex: 1,
          flexDirection: 'row',
          gap: tokens.spacing.md,
          minHeight: 44,
          paddingVertical: tokens.spacing.base,
        },
        title: {
          ...typography.subheading,
          color: themeStyles.textPrimary.color,
          flex: 1,
        },
        toggle: {
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: 44,
          minWidth: 44,
        },
      }),
    [indentDepth, themeStyles, tokens]
  );

  const toggleLabel = t(
    expanded ? 'features.browse.collapse_category' : 'features.browse.expand_category',
    { name: title }
  );

  return (
    <View style={styles.row}>
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        onPress={onSelect}
        style={styles.select}
        testID={testID}
      >
        {indentDepth > 0 ? <View style={styles.indent} /> : null}
        <Text style={styles.title}>{title}</Text>
        {selected ? (
          <Ionicons
            accessibilityElementsHidden
            color={themeStyles.buttonPrimary.backgroundColor}
            importantForAccessibility="no"
            name="checkmark"
            size={20}
          />
        ) : null}
      </Pressable>
      {hasChildren ? (
        <Pressable
          accessibilityLabel={toggleLabel}
          accessibilityRole="button"
          accessibilityState={{ expanded }}
          onPress={onToggleExpand}
          style={styles.toggle}
          testID={`${testID}-expand`}
        >
          <Ionicons
            accessibilityElementsHidden
            color={themeStyles.textSecondary.color}
            importantForAccessibility="no"
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={20}
          />
        </Pressable>
      ) : null}
    </View>
  );
}
