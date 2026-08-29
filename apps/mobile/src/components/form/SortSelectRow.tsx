import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import type { OptionListItem } from './OptionListGroup';
import { OptionListGroup } from './OptionListGroup';
import { SortPill } from './SortPill';

export type SortSelectRowProps<T extends string> = {
  /** Names the control, e.g. "Sort". Shown to assistive tech alongside the current value. */
  heading: string;
  onSelect: (value: T) => void;
  options: readonly OptionListItem<T>[];
  testID: string;
  value: T;
};

/**
 * A sort control that keeps its choices on the screen it belongs to.
 *
 * Home opens a dedicated Filter & Sort screen because it has two controls and a media type to scope
 * them by. A detail screen has one control with a couple of options, so the choices are disclosed
 * in place: the same pill and the same checkmarked option rows, without a push and a Done for a
 * decision that takes one tap. It also means the control works identically wherever the screen is
 * reached from, rather than needing a route registered on every stack that can open it.
 *
 * Selecting collapses the group, because the list below has already changed and the open panel is
 * covering the result.
 */
export function SortSelectRow<T extends string>({
  heading,
  onSelect,
  options,
  testID,
  value,
}: SortSelectRowProps<T>) {
  const { tokens } = useTheme();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        group: {
          marginBottom: tokens.spacing.md,
        },
      }),
    [tokens]
  );

  const selectedLabel = options.find((option) => option.value === value)?.label ?? value;

  return (
    <View testID={testID}>
      <SortPill
        heading={heading}
        isExpanded={isExpanded}
        onPress={() => {
          setIsExpanded((current) => !current);
        }}
        testID={`${testID}-pill`}
        value={selectedLabel}
      />
      {isExpanded ? (
        <View style={styles.group}>
          <OptionListGroup
            onSelect={(nextValue) => {
              setIsExpanded(false);
              onSelect(nextValue);
            }}
            options={options}
            testID={`${testID}-options`}
            value={value}
          />
        </View>
      ) : null}
    </View>
  );
}
