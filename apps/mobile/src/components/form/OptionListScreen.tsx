import { MobileScreenContainer } from '../screen/MobileScreenContainer';
import type { OptionListItem } from './OptionListGroup';
import { OptionListGroup } from './OptionListGroup';

export type { OptionListItem } from './OptionListGroup';

export type OptionListScreenProps<T extends string> = {
  testID: string;
  options: readonly OptionListItem<T>[];
  value: T;
  onSelect: (value: T) => void;
};

/**
 * Full-screen option list for settings with **4+** choices (iOS Settings style). Screen title comes
 * from the native stack header, so the single group needs no heading of its own.
 */
export function OptionListScreen<T extends string>({
  testID,
  options,
  value,
  onSelect,
}: OptionListScreenProps<T>) {
  return (
    <MobileScreenContainer testID={testID}>
      <OptionListGroup onSelect={onSelect} options={options} value={value} />
    </MobileScreenContainer>
  );
}
