import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOItemPerson } from '@podverse/helpers';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

import { AboutPersonRow } from './AboutPersonRow';
import { toAboutPersonFromItem } from './aboutPerson';

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
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        heading: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
          marginTop: tokens.spacing.lg,
        },
        root: {
          gap: tokens.spacing.xs,
        },
      }),
    [themeStyles, tokens]
  );

  const people = useMemo(() => itemPersons.map(toAboutPersonFromItem), [itemPersons]);

  if (people.length === 0) {
    return null;
  }

  return (
    <View style={styles.root} testID={`${testIDPrefix}-people`}>
      <Text accessibilityRole="header" style={styles.heading}>
        {t('info.people.people')}
      </Text>
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
