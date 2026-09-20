import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet } from 'react-native';

import { useTheme } from '../../theme/useTheme';
import { CoverImage, ListRow } from '../primitives';

import type { AboutPerson } from './aboutPerson';

type AboutPersonRowProps = {
  person: AboutPerson;
  testID: string;
};

/**
 * One credited person: optional portrait, name, role, and outbound href when the feed published one.
 */
export function AboutPersonRow({ person, testID }: AboutPersonRowProps) {
  const { t } = useTranslation();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        personImage: {
          height: 48,
          width: 48,
        },
      }),
    []
  );

  const openExternalUrl = useCallback(async (href: string) => {
    try {
      await Linking.openURL(href);
    } catch (error) {
      console.warn('Could not open a person link', href, error);
    }
  }, []);

  const href = person.href;
  const hasLink = href !== null && href.length > 0;

  return (
    <ListRow
      accessibilityLabel={
        hasLink ? `${person.name}, ${t('info.people.link_to_persons_webpage')}` : undefined
      }
      leading={
        <CoverImage
          fallbackLabel={t('info.people.person_image')}
          opensViewer={false}
          style={styles.personImage}
          uri={person.img}
        />
      }
      onPress={
        hasLink
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
