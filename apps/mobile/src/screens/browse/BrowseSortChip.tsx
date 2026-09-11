import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import type { MoreMenuItem, MoreMenuSection } from '../../components/primitives';
import { MoreMenu } from '../../components/primitives';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import {
  BROWSE_RANGE_LABEL_KEYS,
  BROWSE_RANGE_MENU_LABEL_KEYS,
  BROWSE_RANGE_OPTIONS,
} from './browseTypes';
import type { BrowseRangeOption } from './browseTypes';

type BrowseSortChipProps = {
  onRangeChange: (range: BrowseRangeOption) => void;
  range: BrowseRangeOption;
};

/**
 * Popularity range for the Browse directory. The face shows the short range; the caret opens the
 * time-window choices. Outline + square radius keep it distinct from the type pills beside it.
 */
export function BrowseSortChip({ onRangeChange, range }: BrowseSortChipProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const [isOpen, setIsOpen] = useState(false);

  const rangeLabel = t(BROWSE_RANGE_LABEL_KEYS[range]);
  const heading = t('filters.screen.sort_heading');

  const styles = useMemo(
    () =>
      StyleSheet.create({
        caret: {
          marginLeft: tokens.spacing.xs,
        },
        chip: {
          alignItems: 'center',
          backgroundColor: tokens.background.tertiary,
          borderColor: tokens.text.accent,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          flexDirection: 'row',
          marginRight: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        label: {
          ...typography.label,
          color: tokens.text.accent,
        },
      }),
    [tokens]
  );

  const sections = useMemo<MoreMenuSection[]>(() => {
    const items: MoreMenuItem[] = BROWSE_RANGE_OPTIONS.map((option) => ({
      key: option,
      label: t(BROWSE_RANGE_MENU_LABEL_KEYS[option]),
      onPress: () => {
        onRangeChange(option);
      },
      selected: option === range,
      testID: `browse-sort-range-${option}`,
    }));

    return [
      {
        items,
        key: 'range',
        title: t('features.browse.sort_popularity'),
      },
    ];
  }, [onRangeChange, range, t]);

  return (
    <>
      <Pressable
        accessibilityLabel={`${heading}: ${rangeLabel}`}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen }}
        onPress={() => {
          setIsOpen(true);
        }}
        style={styles.chip}
        testID="browse-sort-button"
      >
        <Text style={styles.label}>{rangeLabel}</Text>
        <Ionicons
          accessibilityElementsHidden
          color={tokens.text.accent}
          importantForAccessibility="no"
          name="chevron-down"
          size={14}
          style={styles.caret}
        />
      </Pressable>
      <MoreMenu
        cancelLabel={t('misc.cancel')}
        onCancel={() => {
          setIsOpen(false);
        }}
        sections={sections}
        testID="browse-sort-menu"
        visible={isOpen}
      />
    </>
  );
}
