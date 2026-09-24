import { Children, createContext, useMemo } from 'react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

/** Thin vertical line that lines up with the parent setting title. */
const SETTINGS_DEPENDENT_RAIL_WIDTH = StyleSheet.hairlineWidth;

export type SettingsDependentContextValue = {
  accessibilityHint: string;
  /** True while this row renders as a child of the parent switch. */
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

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    childrenColumn: {
      flex: 1,
    },
    gutter: {
      width: tokens.spacing.lg,
    },
    nest: {
      flexDirection: 'row',
    },
    rail: {
      alignSelf: 'stretch',
      backgroundColor: themeStyles.border.borderColor,
      width: SETTINGS_DEPENDENT_RAIL_WIDTH,
    },
    railGap: {
      width: tokens.spacing.base,
    },
  });

/**
 * Parent switch plus the switches that apply only while it is on. A thin rail sits under the
 * parent title; children indent past it and their switches stay in the parent's column. With no
 * children, only the parent renders.
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
          <View style={styles.nest} testID={testID}>
            <View style={styles.gutter} />
            <View style={styles.rail} />
            <View style={styles.railGap} />
            <View style={styles.childrenColumn}>{childList}</View>
          </View>
        </SettingsDependentContext.Provider>
      ) : null}
    </View>
  );
}
