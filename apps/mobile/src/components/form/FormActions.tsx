import type { StyleProp, ViewStyle } from 'react-native';
import { StyleSheet, View } from 'react-native';

import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { Button } from '../primitives/Button';
import type { ButtonVariant } from '../primitives/Button';

export type FormAction = {
  accessibilityLabel?: string;
  disabled?: boolean;
  label: string;
  loading?: boolean;
  onPress: () => void;
  testID: string;
  variant?: ButtonVariant;
};

export type FormActionsProps = {
  /**
   * Dismiss or secondary actions first, confirm or primary last. The last action renders on the
   * right when more than one action shares the row.
   */
  actions: readonly FormAction[];
  style?: StyleProp<ViewStyle>;
  testID?: string;
};

const createStyles = ({ tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: tokens.spacing.md,
    },
    slot: {
      flex: 1,
      minWidth: 0,
    },
  });

function FormActionButton({ action }: { action: FormAction }) {
  return (
    <Button
      accessibilityLabel={action.accessibilityLabel}
      disabled={action.disabled}
      fullWidth
      label={action.label}
      loading={action.loading}
      onPress={action.onPress}
      testID={action.testID}
      variant={action.variant}
    />
  );
}

/**
 * Form decisions. One action stretches across the row. Two or more share the width equally, with
 * the confirm action last.
 */
export function FormActions({ actions, style, testID }: FormActionsProps) {
  const styles = useThemedStyles(createStyles);
  const onlyAction = actions.length === 1 ? actions[0] : undefined;

  if (onlyAction !== undefined) {
    return (
      <View style={style} testID={testID}>
        <FormActionButton action={onlyAction} />
      </View>
    );
  }

  if (actions.length === 0) {
    return null;
  }

  return (
    <View style={[styles.row, style]} testID={testID}>
      {actions.map((action) => (
        <View key={action.testID} style={styles.slot}>
          <FormActionButton action={action} />
        </View>
      ))}
    </View>
  );
}
