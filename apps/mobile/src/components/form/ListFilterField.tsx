import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { listFilterContentGap } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import { TextField } from './TextField';

export type ListFilterHeaderProps = {
  children: ReactNode;
  /**
   * Extra space under the field when a row, tile, empty banner, spinner, or error follows. List
   * mode uses this padding for that seam; grid mode often uses `listFilterFieldBottomMargin`
   * instead and leaves this false so the two do not stack. The first list row draws its own top
   * hairline; this header does not.
   */
  hasItemsBelow: boolean;
  /**
   * Put **`listFilterFieldBottomMargin`** here (not on the field). The header's `paddingBottom`
   * is the gap from the field down to the content below. Spacing from chips / header above stays
   * the caller's `marginTop`.
   */
  style?: StyleProp<ViewStyle>;
};

/**
 * Wraps a `ListFilterField` so `listFilterContentGap` of space sits under the input when content
 * follows — a row, tile, empty banner, spinner, or error. The line, when there is one, is that
 * first row's top border — not a rule on this header. On a grid that already spaces via
 * `listFilterFieldBottomMargin`, leave `hasItemsBelow` false so the gaps do not stack.
 */
export function ListFilterHeader({ children, hasItemsBelow, style }: ListFilterHeaderProps) {
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        gap: {
          paddingBottom: listFilterContentGap(tokens.spacing),
        },
      }),
    [tokens]
  );

  return <View style={[hasItemsBelow ? styles.gap : null, style]}>{children}</View>;
}

export type ListFilterFieldProps = {
  /** Already-localized. Doubles as the accessible name, so a placeholder is not the label. */
  label: string;
  onChangeTerm: (term: string) => void;
  /** Already-localized. Defaults to `label`. */
  placeholder?: string;
  /**
   * Spacing from chips / header above is the caller's business (`marginTop`). Spacing to the first
   * list or grid content below belongs on **`ListFilterHeader`** via **`listFilterFieldBottomMargin`**
   * so the first row's top hairline is not stuck to the field.
   */
  style?: StyleProp<ViewStyle>;
  /** Input is `${testID}-input`, clear control is `${testID}-clear`. */
  testID: string;
  term: string;
};

/**
 * Free-text filter over a list already on screen. Compact pill matching `SearchField`, with no
 * debounce, so it stays responsive above the list it narrows. The X is inside the pill and mounted
 * only while `term.length > 0`. Its accessible name is the shared Clear Filter string. Pressing it
 * clears the term and leaves the field focused. There is no visible word.
 */
export function ListFilterField({
  label,
  onChangeTerm,
  placeholder,
  style,
  term,
  testID,
}: ListFilterFieldProps) {
  const { t } = useTranslation();

  return (
    <TextField
      accessibilityLabel={label}
      autoCapitalize="none"
      autoCorrect={false}
      clearAccessibilityLabel={t('misc.clear_filter')}
      clearTestID={`${testID}-clear`}
      onChangeText={onChangeTerm}
      placeholder={placeholder ?? label}
      style={style}
      testID={`${testID}-input`}
      value={term}
    />
  );
}
