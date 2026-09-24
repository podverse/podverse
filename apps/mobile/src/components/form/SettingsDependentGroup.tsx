import { Children, createContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type SettingsDependentContextValue = {
  accessibilityHint: string;
  /** True while this row renders inside the inset child panel. */
  nested: true;
};

/**
 * Set while child rows render inside {@link SettingsDependentGroup}. Absent on a standalone row.
 */
export const SettingsDependentContext = createContext<SettingsDependentContextValue | null>(null);

export type SettingsDependentGroupProps = {
  /** Parent control the children belong to. Rendered full width. */
  parent: ReactNode;
  /** Already-localized name of the parent setting, read with each child switch. */
  parentLabel: string;
  children?: ReactNode;
  /**
   * Applied to the child block only, so the id mounts and unmounts with the children.
   */
  testID?: string;
};

const createStyles = ({ tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    panel: {
      backgroundColor: tokens.background.tertiary,
      borderRadius: tokens.radii.sm,
      marginBottom: tokens.spacing.md,
      marginLeft: tokens.spacing.lg,
      marginRight: tokens.spacing.md,
      overflow: 'hidden',
    },
  });

/**
 * Parent switch plus the switches that apply only while it is on. Children sit in a tertiary
 * inset panel indented under the parent title; their switches stay in the parent's column.
 * With no children, only the parent renders.
 */
export function SettingsDependentGroup({
  children,
  parent,
  parentLabel,
  testID,
}: SettingsDependentGroupProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const childList = Children.toArray(children);
  const accessibilityHint = t('settings.dependent_of', { parent: parentLabel });
  const contextValue = useMemo(
    (): SettingsDependentContextValue => ({ accessibilityHint, nested: true }),
    [accessibilityHint]
  );

  return (
    <View>
      {parent}
      {childList.length > 0 ? (
        <SettingsDependentContext.Provider value={contextValue}>
          <View style={styles.panel} testID={testID}>
            {childList}
          </View>
        </SettingsDependentContext.Provider>
      ) : null}
    </View>
  );
}
