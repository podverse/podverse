import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { DTOItemPerson } from '@podverse/helpers';

import { useTheme } from '../../theme/useTheme';
import { SectionHeading } from '../section/SectionHeading';
import { toAboutPersonFromItem } from './aboutPerson';
import { AboutPersonRow } from './AboutPersonRow';

type ItemSummaryPeopleProps = {
  itemPersons: DTOItemPerson[];
  testIDPrefix: string;
};

/**
 * People credited on an item. Renders under Summary description when `item_persons` is non-empty.
 * Never falls back to channel people.
 */
export function ItemSummaryPeople({ itemPersons, testIDPrefix }: ItemSummaryPeopleProps) {
  const { t } = useTranslation();
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        heading: {
          marginTop: tokens.spacing.lg,
        },
        root: {
          gap: tokens.spacing.xs,
        },
      }),
    [tokens]
  );

  const people = useMemo(() => itemPersons.map(toAboutPersonFromItem), [itemPersons]);

  if (people.length === 0) {
    return null;
  }

  return (
    <View style={styles.root} testID={`${testIDPrefix}-people`}>
      <SectionHeading style={styles.heading}>{t('info.people.people')}</SectionHeading>
      {people.map((person) => (
        <AboutPersonRow
          key={person.id}
          person={person}
          testID={`${testIDPrefix}-person-${person.id}`}
        />
      ))}
    </View>
  );
}
