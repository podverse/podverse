import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, View } from 'react-native';

import type { DTOChannelPerson } from '@podverse/helpers';

import { CoverImage, FillList, ListRow } from '../../../components/primitives';
import { ListEmpty } from '../../../components/state/ListEmpty';
import { LoadingSection } from '../../../components/state/LoadingSection';
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
 * This section reads the channel the screen owns. Until that load settles, the body is a spinner —
 * an empty description is only shown after the channel is known.
 *
 * The cells are a single list rather than a scroll view of blocks: the identity block and chips stay
 * pinned, and prose and person rows take their turn in this list like any other section's rows.
 */
export function PodcastAboutSection({
  channel,
  isChannelLoading,
  listHeader,
}: PodcastSectionPaneProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          paddingBottom: tokens.spacing['2xl'],
          paddingHorizontal: screenBodyInsets(tokens.spacing).paddingHorizontal,
        },
        heading: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
          marginTop: tokens.spacing.lg,
        },
        list: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
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
        isChannelLoading ? (
          <LoadingSection testID="podcast-detail-about-loading" />
        ) : (
          <ListEmpty messageKey="info.summary.no_summary" testID="podcast-detail-about-empty" />
        )
      }
      ListHeaderComponent={
        listHeader !== null && listHeader !== undefined ? <>{listHeader}</> : null
      }
      accessibilityLabel={t('info.about')}
      contentContainerStyle={styles.content}
      data={isChannelLoading ? [] : cells}
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
