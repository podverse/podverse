import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { SectionChipItem } from '../../components/form';
import { SectionChipRow } from '../../components/form';

export type MediaTypeSelectorProps<T extends string> = {
  labelKeys: Record<T, string>;
  /** Controls that scroll ahead of the type chips (sort, Categories). */
  leading?: ReactNode;
  onChange: (mediaType: T) => void;
  /** `null` when no type chip is selected (the Categories list is showing). */
  selectedMediaType: T | null;
  testIDPrefix: string;
  types: readonly T[];
};

/**
 * Horizontal media-type pills. Home and Browse render this under the stack title.
 */
export function MediaTypeSelector<T extends string>({
  labelKeys,
  leading,
  onChange,
  selectedMediaType,
  testIDPrefix,
  types,
}: MediaTypeSelectorProps<T>) {
  const { t } = useTranslation();

  const items = useMemo<SectionChipItem<T>[]>(
    () =>
      types.map((mediaType) => ({
        key: mediaType,
        label: t(labelKeys[mediaType]),
        testID: `${testIDPrefix}-media-type-${mediaType}`,
      })),
    [labelKeys, t, testIDPrefix, types]
  );

  return (
    <SectionChipRow
      items={items}
      leading={leading}
      onSelect={onChange}
      selectedKey={selectedMediaType}
      testID={`${testIDPrefix}-media-type-selector`}
    />
  );
}
