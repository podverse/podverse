import { useMemo } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

export type MoreMenuItem = {
  disabled?: boolean;
  key: string;
  label: string;
  onPress: () => void;
  selected?: boolean;
  testID?: string;
};

export type MoreMenuSection = {
  items: MoreMenuItem[];
  key: string;
  title?: string;
};

export type MoreMenuProps = {
  cancelLabel: string;
  cancelTestID?: string;
  onCancel: () => void;
  sections: MoreMenuSection[];
  testID: string;
  visible: boolean;
};

const SELECTED_MARK = '✓';
const ACTION_ROW_MIN_HEIGHT = 62;

type SheetRow =
  { kind: 'title'; key: string; title: string } | { kind: 'item'; item: MoreMenuItem; key: string };

const collectSheetRows = (sections: MoreMenuSection[]): SheetRow[] => {
  const rows: SheetRow[] = [];
  for (const section of sections) {
    if (section.title !== undefined) {
      rows.push({ key: `title-${section.key}`, kind: 'title', title: section.title });
    }
    for (const item of section.items) {
      rows.push({ item, key: item.key, kind: 'item' });
    }
  }
  return rows;
};

/**
 * Overflow menu for a More control. Appears instantly at the bottom (no slide or fade): one rounded
 * action group (tertiary fill, centered bold command rows) and a separate Cancel block
 * (quaternary fill, same bold type). Callers pass already-localized labels. The scrim also
 * dismisses.
 */
export function MoreMenu({
  cancelLabel,
  cancelTestID,
  onCancel,
  sections,
  testID,
  visible,
}: MoreMenuProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const insets = useSafeAreaInsets();
  const rows = useMemo(() => collectSheetRows(sections), [sections]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actionGroup: {
          backgroundColor: tokens.background.tertiary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          overflow: 'hidden',
        },
        backdrop: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          flex: 1,
          justifyContent: 'flex-end',
        },
        cancel: {
          alignItems: 'center',
          backgroundColor: tokens.background.quaternary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          justifyContent: 'center',
          marginTop: tokens.spacing.md,
          minHeight: ACTION_ROW_MIN_HEIGHT,
        },
        cancelLabel: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
          fontWeight: '700',
          textAlign: 'center',
        },
        itemDisabled: {
          opacity: 0.5,
        },
        itemDivider: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: 1,
        },
        itemLabel: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
          fontWeight: '700',
          textAlign: 'center',
          width: '100%',
        },
        itemPressed: {
          opacity: 0.7,
        },
        itemRow: {
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: ACTION_ROW_MIN_HEIGHT,
          paddingHorizontal: tokens.spacing.lg,
        },
        sectionTitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          fontWeight: '700',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.base,
          textAlign: 'center',
        },
        selectedMark: {
          ...typography.heading,
          color: themeStyles.buttonPrimary.backgroundColor,
          fontWeight: '700',
          position: 'absolute',
          right: tokens.spacing.lg,
        },
        sheet: {
          paddingBottom: Math.max(insets.bottom, tokens.spacing['2xl']),
          paddingHorizontal: tokens.spacing.lg,
        },
      }),
    [insets.bottom, themeStyles, tokens]
  );

  return (
    <Modal animationType="none" onRequestClose={onCancel} transparent visible={visible}>
      <View style={styles.backdrop}>
        <Pressable
          accessible={false}
          onPress={onCancel}
          style={StyleSheet.absoluteFill}
          testID={`${testID}-backdrop`}
        />
        <View
          accessibilityRole="menu"
          accessibilityViewIsModal
          style={styles.sheet}
          testID={testID}
        >
          <View style={styles.actionGroup}>
            {rows.map((row, index) => {
              const showDivider = index > 0;
              if (row.kind === 'title') {
                return (
                  <Text
                    key={row.key}
                    style={[styles.sectionTitle, showDivider ? styles.itemDivider : null]}
                  >
                    {row.title}
                  </Text>
                );
              }

              const { item } = row;
              const isDisabled = item.disabled === true;
              const isSelected = item.selected === true;
              return (
                <Pressable
                  accessibilityRole="menuitem"
                  accessibilityState={{
                    disabled: isDisabled,
                    selected: item.selected,
                  }}
                  disabled={isDisabled}
                  key={item.key}
                  onPress={() => {
                    onCancel();
                    item.onPress();
                  }}
                  style={({ pressed }) => [
                    styles.itemRow,
                    showDivider ? styles.itemDivider : null,
                    isDisabled ? styles.itemDisabled : null,
                    !isDisabled && pressed ? styles.itemPressed : null,
                  ]}
                  testID={item.testID ?? `${testID}-${item.key}`}
                >
                  <Text numberOfLines={1} style={styles.itemLabel}>
                    {item.label}
                  </Text>
                  {isSelected ? (
                    <Text
                      accessibilityElementsHidden
                      importantForAccessibility="no"
                      style={styles.selectedMark}
                    >
                      {SELECTED_MARK}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={onCancel}
            style={({ pressed }) => [styles.cancel, pressed ? styles.itemPressed : null]}
            testID={cancelTestID ?? `${testID}-cancel`}
          >
            <Text numberOfLines={1} style={styles.cancelLabel}>
              {cancelLabel}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
