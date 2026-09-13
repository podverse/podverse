import { Ionicons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import type { MoreMenuItem, MoreMenuSection } from '../primitives';
import { MoreMenu } from '../primitives';
import { filterChipChrome } from './chipChrome';

export type MenuSelectChipOption<T extends string> = {
  /** Already-localized. */
  label: string;
  /** Shown on the chip face when it should be shorter than the menu row. Defaults to `label`. */
  shortLabel?: string;
  /** Defaults to `${testID}-${value}`. */
  testID?: string;
  value: T;
};

export type MenuSelectChipProps<T extends string> = {
  /** When true, the chip stays visible but does not open — use to hold layout while a section is unsortable. */
  disabled?: boolean;
  /** Names the control, e.g. "Sort". Paired with the current value as the accessible name. */
  heading: string;
  /** Sheet section title. Defaults to `heading`. */
  menuTitle?: string;
  onSelect: (value: T) => void;
  options: readonly MenuSelectChipOption<T>[];
  /** Face is `${testID}-button`, sheet is `${testID}-menu`, rows are `${testID}-<value>`. */
  testID: string;
  value: T;
};

/**
 * A chip whose face is the current selection and whose caret opens the choices as a sheet.
 *
 * Outline and square radius keep it distinct from the selection pills beside it in a chip row: this
 * one narrows the list the pills choose, rather than choosing a list. The sheet is what makes it
 * usable for four or more choices without leaving the screen the list is on.
 *
 * Keep the chip mounted when a section cannot use it (`disabled`) so neighboring pills do not jump.
 */
export function MenuSelectChip<T extends string>({
  disabled = false,
  heading,
  menuTitle,
  onSelect,
  options,
  testID,
  value,
}: MenuSelectChipProps<T>) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  const selected = options.find((option) => option.value === value);
  const faceLabel = selected?.shortLabel ?? selected?.label ?? value;

  const styles = useMemo(() => {
    const chrome = filterChipChrome(
      tokens,
      { borderColor: themeStyles.border.borderColor, textColor: themeStyles.textPrimary.color },
      !disabled
    );
    const labelColor = disabled ? themeStyles.textSecondary.color : chrome.label.color;

    return StyleSheet.create({
      caret: {
        marginLeft: tokens.spacing.xs,
      },
      chip: {
        alignItems: 'center',
        borderWidth: 1,
        flexDirection: 'row',
        marginRight: tokens.spacing.sm,
        opacity: disabled ? 0.5 : 1,
        paddingHorizontal: tokens.spacing.md,
        paddingVertical: tokens.spacing.sm,
        ...chrome.chip,
        ...(disabled
          ? {
              backgroundColor: tokens.background.secondary,
              borderColor: themeStyles.border.borderColor,
            }
          : null),
      },
      label: {
        ...typography.label,
        color: labelColor,
      },
    });
  }, [disabled, themeStyles, tokens]);

  const sections = useMemo<MoreMenuSection[]>(() => {
    const items: MoreMenuItem[] = options.map((option) => ({
      key: option.value,
      label: option.label,
      onPress: () => {
        onSelect(option.value);
      },
      selected: option.value === value,
      testID: option.testID ?? `${testID}-${option.value}`,
    }));

    return [{ items, key: 'options', title: menuTitle ?? heading }];
  }, [heading, menuTitle, onSelect, options, testID, value]);

  return (
    <>
      <Pressable
        accessibilityLabel={`${heading}: ${faceLabel}`}
        accessibilityRole="button"
        accessibilityState={{ disabled, expanded: isOpen }}
        disabled={disabled}
        onPress={() => {
          setIsOpen(true);
        }}
        style={styles.chip}
        testID={`${testID}-button`}
      >
        <Text style={styles.label}>{faceLabel}</Text>
        <Ionicons
          accessibilityElementsHidden
          color={disabled ? themeStyles.textSecondary.color : tokens.text.accent}
          importantForAccessibility="no"
          name="chevron-down"
          size={14}
          style={styles.caret}
        />
      </Pressable>
      {disabled ? null : (
        <MoreMenu
          cancelLabel={t('misc.cancel')}
          onCancel={() => {
            setIsOpen(false);
          }}
          sections={sections}
          testID={`${testID}-menu`}
          visible={isOpen}
        />
      )}
    </>
  );
}
