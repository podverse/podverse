import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import type { SubscriptionListFilter } from '../../prefs/subscriptionFilter';
import { useTheme } from '../../theme/useTheme';

type SubscriptionFilterControlProps = {
  onChange: (filter: SubscriptionListFilter) => void;
  selectedFilter: SubscriptionListFilter;
  /** Container testID; chip testIDs derive as `${testID}-all` / `${testID}-addByRss`. */
  testID: string;
};

const FILTER_OPTIONS: { filter: SubscriptionListFilter; labelKey: string }[] = [
  { filter: 'all', labelKey: 'subscriptions.filter.all' },
  { filter: 'addByRss', labelKey: 'subscriptions.filter.add_by_rss' },
];

/**
 * Shared All / Add-by-RSS segmented filter for the unified subscribed views (Home 8.16, Library
 * 9.30). Copy is localized here; persistence is owned by the caller (device prefs).
 */
export function SubscriptionFilterControl({
  onChange,
  selectedFilter,
  testID,
}: SubscriptionFilterControlProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          marginRight: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
        },
        chipActive: {
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderColor: themeStyles.buttonPrimary.backgroundColor,
        },
        chipLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 13,
          fontWeight: '600',
        },
        chipLabelActive: {
          color: themeStyles.buttonPrimary.color,
        },
        row: {
          flexDirection: 'row',
          marginBottom: tokens.spacing.sm,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <View style={styles.row} testID={testID}>
      {FILTER_OPTIONS.map((option) => {
        const isSelected = option.filter === selectedFilter;

        return (
          <Pressable
            accessibilityRole="button"
            // Which chip is active is conveyed by fill colour alone otherwise, which assistive
            // technology cannot read — leaving a screen reader user unable to tell what the list
            // beneath is currently scoped to.
            accessibilityState={{ selected: isSelected }}
            key={option.filter}
            onPress={() => {
              onChange(option.filter);
            }}
            style={[styles.chip, isSelected ? styles.chipActive : null]}
            testID={`${testID}-${option.filter}`}
          >
            <Text style={[styles.chipLabel, isSelected ? styles.chipLabelActive : null]}>
              {t(option.labelKey)}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
