import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, View } from 'react-native';

import type { DTOChannelPerson } from '@podverse/helpers';

import { CoverImage, FillList, ListRow } from '../../../components/primitives';
import { ListEmpty } from '../../../components/state/ListEmpty';
import { screenBodyInsets } from '../../../theme/screenLayout';
import { typography } from '../../../theme/typography';
import { useTheme } from '../../../theme/useTheme';
import type { PodcastSectionPaneProps } from './podcastSectionPane';

type AboutCell =
  | { key: string; kind: 'description'; text: string }
  | { key: string; kind: 'people-heading' }
  | { key: string; kind: 'person'; person: DTOChannelPerson };

/**
 * The channel's own description in full, plus the people credited in its feed.
 *
 * Everything here came down with the channel the screen already loaded, so this section needs no
 * request of its own and reads the same with no connection at all.
 *
 * The cells are a single list rather than a scroll view of blocks: the identity block above still owns
 * the scroll, and prose and person rows take their turn in it like any other section's rows.
 */
export function PodcastAboutSection({ channel, listHeader }: PodcastSectionPaneProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          ...screenBodyInsets(tokens.spacing),
          paddingBottom: tokens.spacing['2xl'],
        },
        heading: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
          marginTop: tokens.spacing.lg,
        },
        list: {
          backgroundColor: themeStyles.screen.backgroundColor,
        },
        personImage: {
          height: 48,
          width: 48,
        },
        prose: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
        },
        surface: {
          backgroundColor: tokens.background.secondary,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          marginTop: tokens.spacing.sm,
          padding: tokens.spacing.lg,
        },
      }),
    [themeStyles, tokens]
  );

  const cells = useMemo<AboutCell[]>(() => {
    const description = channel?.channel_description?.value ?? '';
    const people = channel?.channel_persons ?? [];
    const next: AboutCell[] = [];

    if (description.length > 0) {
      next.push({ key: 'description', kind: 'description', text: description });
    }

    if (people.length > 0) {
      next.push({ key: 'people-heading', kind: 'people-heading' });
      for (const person of people) {
        next.push({ key: `person-${person.id}`, kind: 'person', person });
      }
    }

    return next;
  }, [channel]);

  /**
   * A credited person's link goes to whatever they published it as, which is the open web rather than
   * anything this app can render. A link that will not open is left as a row that simply reads.
   */
  const openPersonLink = useCallback(async (href: string) => {
    try {
      await Linking.openURL(href);
    } catch (error) {
      console.warn('Could not open the link for a credited person', href, error);
    }
  }, []);

  const renderPerson = (person: DTOChannelPerson) => {
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
                void openPersonLink(href);
              }
            : undefined
        }
        subtitle={person.role ?? undefined}
        testID={`podcast-detail-person-${person.id}`}
        title={person.name}
      />
    );
  };

  return (
    <FillList
      ListEmptyComponent={
        <ListEmpty messageKey="info.summary.no_summary" testID="podcast-detail-about-empty" />
      }
      ListHeaderComponent={listHeader}
      accessibilityLabel={t('info.about')}
      contentContainerStyle={styles.content}
      data={cells}
      keyExtractor={(cell) => cell.key}
      renderItem={({ item: cell }) => {
        if (cell.kind === 'description') {
          return (
            <View style={styles.surface}>
              <Text style={styles.prose}>{cell.text}</Text>
            </View>
          );
        }

        if (cell.kind === 'people-heading') {
          return (
            <Text accessibilityRole="header" style={styles.heading}>
              {t('info.people.people')}
            </Text>
          );
        }

        return renderPerson(cell.person);
      }}
      style={styles.list}
      testID="podcast-detail-about"
    />
  );
}
