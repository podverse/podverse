import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';

/**
 * One row in the sheet. `label` arrives **already localized** — this component holds no strings —
 * and `key` is the React key and the default `testID` suffix.
 *
 * `selected` is the difference between an action and a choice. Omit it for something that happens
 * ("Mark All As Seen"); set it on every row of a group where one option is currently in effect, so
 * the sheet draws a checkmark and reports the state rather than leaving a sighted-only cue.
 */
export type ActionSheetItem = {
  disabled?: boolean;
  key: string;
  label: string;
  onPress: () => void;
  selected?: boolean;
  testID?: string;
};

export type ActionSheetSection = {
  items: ActionSheetItem[];
  key: string;
  /** Localized heading. Omit for an unlabelled group of plain actions. */
  title?: string;
};

export type ActionSheetProps = {
  onRequestClose: () => void;
  sections: ActionSheetSection[];
  testID: string;
  visible: boolean;
};

/** Rendered rather than an icon font so the checkmark needs no asset and no glyph fallback. */
const SELECTED_MARK = '✓';

/**
 * Bottom-anchored sheet of choices and actions, the app's standard way to offer a short menu.
 *
 * Shared rather than rebuilt per screen because the parts that are easy to get wrong are the ones
 * that do not show up in a screenshot: keeping a screen reader inside the sheet while it is open,
 * reporting which option is in effect, and reporting a disabled row as disabled rather than as
 * merely faint.
 */
export function ActionSheet({ onRequestClose, sections, testID, visible }: ActionSheetProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        // Neutral dimming scrim (not a theme color); mirrors the standard RN modal backdrop.
        backdrop: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          flex: 1,
          justifyContent: 'flex-end',
        },
        itemDisabled: {
          opacity: 0.5,
        },
        itemLabel: {
          color: themeStyles.textPrimary.color,
          flex: 1,
          fontSize: 16,
        },
        itemRow: {
          alignItems: 'center',
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: 1,
          flexDirection: 'row',
          gap: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
        },
        selectedMark: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '700',
        },
        sheet: {
          backgroundColor: themeStyles.screen.backgroundColor,
          borderTopLeftRadius: tokens.radii.md,
          borderTopRightRadius: tokens.radii.md,
          paddingBottom: tokens.spacing['2xl'],
          paddingTop: tokens.spacing.sm,
        },
        title: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          fontWeight: '600',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <Modal animationType="slide" onRequestClose={onRequestClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        {/* The scrim is a sighted-only shortcut for dismissing, so it stays out of the accessibility
            tree; the sheet claims touches separately so row presses cannot dismiss it accidentally. */}
        <Pressable accessible={false} onPress={onRequestClose} style={StyleSheet.absoluteFill} />
        <View
          accessibilityRole="menu"
          accessibilityViewIsModal
          onStartShouldSetResponder={() => true}
          style={styles.sheet}
          testID={testID}
        >
          {sections.map((section) => (
            <View key={section.key}>
              {section.title !== undefined ? (
                <Text style={styles.title}>{section.title}</Text>
              ) : null}
              {section.items.map((item) => (
                <Pressable
                  accessibilityRole="menuitem"
                  accessibilityState={{
                    disabled: item.disabled ?? false,
                    selected: item.selected,
                  }}
                  disabled={item.disabled ?? false}
                  key={item.key}
                  onPress={() => {
                    onRequestClose();
                    item.onPress();
                  }}
                  style={[styles.itemRow, item.disabled === true ? styles.itemDisabled : null]}
                  testID={item.testID ?? `${testID}-${item.key}`}
                >
                  <Text style={styles.itemLabel}>{item.label}</Text>
                  {item.selected === true ? (
                    // Decorative: `accessibilityState.selected` on the row already carries this.
                    <Text
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      style={styles.selectedMark}
                    >
                      {SELECTED_MARK}
                    </Text>
                  ) : null}
                </Pressable>
              ))}
            </View>
          ))}
        </View>
      </View>
    </Modal>
  );
}
