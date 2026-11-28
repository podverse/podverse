import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking } from 'react-native';

import { personCreditHttpUrl } from '@podverse/helpers/person';

import { LIST_ROW_ARTWORK_SIZE } from '../../theme/screenLayout';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { CoverImage, ListRow } from '../primitives';
import type { AboutPerson } from './aboutPerson';

type AboutPersonRowProps = {
  onOpenPerson?: (personIdText: string) => void;
  person: AboutPerson;
  testID: string;
};

const createStyles = (_theme: ThemedStylesTheme) => ({
  personImage: {
    height: LIST_ROW_ARTWORK_SIZE,
    width: LIST_ROW_ARTWORK_SIZE,
  },
});

/**
 * One credited person: optional portrait, name, role, and outbound href when the feed published one.
 */
export function AboutPersonRow({ onOpenPerson, person, testID }: AboutPersonRowProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  const openExternalUrl = useCallback(async (href: string) => {
    try {
      await Linking.openURL(href);
    } catch (error) {
      console.warn('Could not open a person link', href, error);
    }
  }, []);

  const href = personCreditHttpUrl(person.href);
  const imageUrl = personCreditHttpUrl(person.img);
  const hasWebsite = href !== null;
  const personIdText = person.personIdText;
  const opensPerson = personIdText !== null && personIdText !== '' && onOpenPerson !== undefined;

  return (
    <ListRow
      accessibilityLabel={
        opensPerson
          ? person.name
          : hasWebsite
            ? `${person.name}, ${t('info.people.website')}`
            : undefined
      }
      leading={<CoverImage opensViewer={false} style={styles.personImage} uri={imageUrl} />}
      onPress={
        opensPerson
          ? () => {
              onOpenPerson(personIdText);
            }
          : hasWebsite
            ? () => {
                void openExternalUrl(href);
              }
            : undefined
      }
      subtitle={person.role ?? undefined}
      testID={testID}
      title={person.name}
    />
  );
}
