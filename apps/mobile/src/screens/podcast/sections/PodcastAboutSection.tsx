import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOChannelPerson } from '@podverse/helpers';

import { CoverImage, FillList, ListRow } from '../../../components/primitives';
import { ListEmpty } from '../../../components/state/ListEmpty';
import { LoadingSection } from '../../../components/state/LoadingSection';
import { screenBodyInsets } from '../../../theme/screenLayout';
import { typography } from '../../../theme/typography';
import { useTheme } from '../../../theme/useTheme';
import type { PodcastSectionPaneProps } from './podcastSectionPane';

type AboutCell =
  | {
      key: string;
      kind: 'description';
      feedUrl: string | null;
      text: string | null;
      websiteUrl: string | null;
    }
  | { key: string; kind: 'people-heading' }
  | { key: string; kind: 'person'; person: DTOChannelPerson };

const nonEmpty = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined || value.length === 0) {
    return null;
  }
  return value;
};

/**
 * The channel's own description in full, its RSS and website URLs, and the people credited in its
 * feed.
 *
 * This section reads the channel the screen owns. Until that load settles, the body is a spinner —
 * an empty description is only shown after the channel is known.
 *
 * The cells are a single list rather than a scroll view of blocks: the identity block and chips stay
 * pinned, and prose, outbound links, and person rows take their turn in this list like any other
 * section's rows. Links sit under the description and above People so they stay with the
 * publisher copy.
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
        linkLabel: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
          fontWeight: '600',
        },
        linkLine: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
        },
        links: {
          gap: tokens.spacing.sm,
        },
        linksAfterProse: {
          marginTop: tokens.spacing.lg,
        },
        linkUrl: {
          ...typography.body,
          color: tokens.text.accent,
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
    const description = nonEmpty(channel?.channel_description?.value);
    const feedUrl = nonEmpty(channel?.feed?.url);
    const websiteUrl = nonEmpty(channel?.channel_about?.website_link_url);
    const people = channel?.channel_persons ?? [];
    const next: AboutCell[] = [];

    if (description !== null || feedUrl !== null || websiteUrl !== null) {
      next.push({
        feedUrl,
        key: 'description',
        kind: 'description',
        text: description,
        websiteUrl,
      });
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
   * Outbound About links (RSS, website, a credited person) go to whatever the publisher published,
   * which is the open web rather than anything this app can render. A URL that will not open is left
   * as a control that simply reads.
   */
  const openExternalUrl = useCallback(async (href: string) => {
    try {
      await Linking.openURL(href);
    } catch (error) {
      console.warn('Could not open an About link', href, error);
    }
  }, []);

  const renderOutboundLink = (label: string, url: string, testID: string) => (
    <Pressable
      accessibilityLabel={`${label}: ${url}`}
      accessibilityRole="link"
      onPress={() => {
        void openExternalUrl(url);
      }}
      testID={testID}
    >
      <Text style={styles.linkLine}>
        <Text style={styles.linkLabel}>{`${label}: `}</Text>
        <Text style={styles.linkUrl}>{url}</Text>
      </Text>
    </Pressable>
  );

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
                void openExternalUrl(href);
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
          const hasProse = cell.text !== null;
          const hasLinks = cell.feedUrl !== null || cell.websiteUrl !== null;

          return (
            <View style={styles.surface}>
              {hasProse ? <Text style={styles.prose}>{cell.text}</Text> : null}
              {hasLinks ? (
                <View style={[styles.links, hasProse ? styles.linksAfterProse : null]}>
                  {cell.feedUrl !== null
                    ? renderOutboundLink(t('info.rss'), cell.feedUrl, 'podcast-detail-rss')
                    : null}
                  {cell.websiteUrl !== null
                    ? renderOutboundLink(t('info.website'), cell.websiteUrl, 'podcast-detail-website')
                    : null}
                </View>
              ) : null}
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
