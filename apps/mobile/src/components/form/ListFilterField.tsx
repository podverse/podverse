import type { ReactNode } from 'react';
import { useMemo } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { listFilterContentGap } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import { Button } from '../primitives';
import { TextField } from './TextField';

export type ListFilterHeaderProps = {
  children: ReactNode;
  /** Hairline on the bottom edge only when a row or tile follows this header. */
  hasItemsBelow: boolean;
  /**
   * Put **`listFilterFieldBottomMargin`** here (not on the field) so that gap sits *below* the
   * hairline. `listFilterContentGap` padding lives *above* the hairline so the line does not fuse
   * with the field border. Spacing from chips / header above stays the caller's `marginTop`.
   */
  style?: StyleProp<ViewStyle>;
};

/**
 * Wraps a `ListFilterField` so a hairline sits between the field and the first list row or grid
 * tile, with `listFilterContentGap` of space under the input. Omit the line when the list is empty
 * or the term hid every row.
 */
export function ListFilterHeader({ children, hasItemsBelow, style }: ListFilterHeaderProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        divider: {
          borderBottomColor: themeStyles.border.borderColor,
          borderBottomWidth: StyleSheet.hairlineWidth,
          paddingBottom: listFilterContentGap(tokens.spacing),
        },
      }),
    [themeStyles, tokens]
  );

  return <View style={[hasItemsBelow ? styles.divider : null, style]}>{children}</View>;
}

export type ListFilterFieldProps = {
  /** Already-localized label for the control that empties the term. */
  clearLabel: string;
  /** Already-localized. Doubles as the accessible name, so a placeholder is not the label. */
  label: string;
  onChangeTerm: (term: string) => void;
  /** Already-localized. Defaults to `label`. */
  placeholder?: string;
  /**
   * Spacing from chips / header above is the caller's business (`marginTop`). Spacing to the first
   * list or grid content below belongs on **`ListFilterHeader`** via **`listFilterFieldBottomMargin`**
   * so the hairline stays attached to the field and the gap sits below it.
   */
  style?: StyleProp<ViewStyle>;
  /** Input is `${testID}-input`, clear control is `${testID}-clear`. */
  testID: string;
  term: string;
};

/**
 * Free-text filter over a list already on screen. Uses `TextField` so the pill matches
 * `SearchField`.
 *
 * Narrows what is rendered rather than requesting anything, so it stays responsive with no debounce
 * and belongs above the list it filters. The clear control appears only once there is a term to
 * clear, keeping an empty field from carrying a control that would do nothing.
 */
export function ListFilterField({
  clearLabel,
  label,
  onChangeTerm,
  placeholder,
  style,
  term,
  testID,
}: ListFilterFieldProps) {
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        field: {
          flex: 1,
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          gap: tokens.spacing.sm,
        },
      }),
    [tokens]
  );

  return (
    <View style={[styles.row, style]}>
      <TextField
        accessibilityLabel={label}
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={onChangeTerm}
        placeholder={placeholder ?? label}
        style={styles.field}
        testID={`${testID}-input`}
        value={term}
      />
      {term.length > 0 ? (
        <Button
          accessibilityLabel={clearLabel}
          label={clearLabel}
          onPress={() => {
            onChangeTerm('');
          }}
          size="sm"
          testID={`${testID}-clear`}
          variant="outline"
        />
      ) : null}
    </View>
  );
}
