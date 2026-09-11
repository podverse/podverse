import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type MediaTypeChipProps = {
  label: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
};

export type MediaTypeSelectorProps<T extends string> = {
  labelKeys: Record<T, string>;
  /** Controls that scroll ahead of the type chips (sort, Categories). */
  leading?: ReactNode;
  onChange: (mediaType: T) => void;
  /** `null` when no type chip is selected (the Categories list is showing). */
  selectedMediaType: T | null;
  testIDPrefix: string;
  types: readonly T[];
};

export function MediaTypeChip({ label, onPress, selected, testID }: MediaTypeChipProps) {
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
          paddingVertical: tokens.spacing.sm,
        },
        chipActive: {
          backgroundColor: themeStyles.buttonPrimary.backgroundColor,
          borderColor: themeStyles.buttonPrimary.backgroundColor,
        },
        chipLabel: {
          ...typography.label,
          color: themeStyles.textPrimary.color,
        },
        chipLabelActive: {
          color: themeStyles.buttonPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={[styles.chip, selected ? styles.chipActive : null]}
      testID={testID}
    >
      <Text style={[styles.chipLabel, selected ? styles.chipLabelActive : null]}>{label}</Text>
    </Pressable>
  );
}

/**
 * Horizontal media-type pills. Home and Browse render this under the stack title.
 */
export function MediaTypeSelector<T extends string>({
  labelKeys,
  leading,
  onChange,
  selectedMediaType,
  testIDPrefix,
  types,
}: MediaTypeSelectorProps<T>) {
  const { t } = useTranslation();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        scrollContent: {
          alignItems: 'center',
        },
      }),
    []
  );

  return (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      horizontal
      showsHorizontalScrollIndicator={false}
      testID={`${testIDPrefix}-media-type-selector`}
    >
      {leading}
      {types.map((mediaType) => {
        const isSelected = mediaType === selectedMediaType;
        const label = t(labelKeys[mediaType]);

        return (
          <MediaTypeChip
            key={mediaType}
            label={label}
            onPress={() => {
              onChange(mediaType);
            }}
            selected={isSelected}
            testID={`${testIDPrefix}-media-type-${mediaType}`}
          />
        );
      })}
    </ScrollView>
  );
}
