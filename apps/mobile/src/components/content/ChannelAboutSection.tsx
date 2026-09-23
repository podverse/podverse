import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import type { DTOChannel } from '@podverse/helpers';

import { screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { FillList } from '../primitives';
import { ListEmpty } from '../state/ListEmpty';
import { LoadingSection } from '../state/LoadingSection';
import { AboutPersonRow } from './AboutPersonRow';
import { buildChannelAboutCells } from './channelAboutCells';

export type ChannelAboutSectionProps = {
  channel: DTOChannel | null;
  isChannelLoading: boolean;
  /** Title filter or other chrome that scrolls with the About rows. */
  listHeader?: ReactNode;
  /**
   * Prefix for testIDs (`podcast-detail`, `album-detail`, `artist-detail`) so each screen keeps
   * its own Maestro locators.
   */
  testIDPrefix: string;
};

/**
 * Channel About: description prose, RSS and website links (tucked here on mobile rather than as
 * header icons), and the people credited on the channel.
 *
 * People render whenever `channel_persons` is non-empty, even if description prose is missing.
 * Funding is a separate chip, not a link in this section.
 */
export function ChannelAboutSection({
  channel,
  isChannelLoading,
  listHeader,
  testIDPrefix,
}: ChannelAboutSectionProps) {
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

  const cells = useMemo(() => buildChannelAboutCells(channel), [channel]);

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

  return (
    <FillList
      ListEmptyComponent={
        isChannelLoading ? (
          <LoadingSection testID={`${testIDPrefix}-about-loading`} />
        ) : (
          <ListEmpty messageKey="info.summary.no_summary" testID={`${testIDPrefix}-about-empty`} />
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
                    ? renderOutboundLink(t('info.rss'), cell.feedUrl, `${testIDPrefix}-rss`)
                    : null}
                  {cell.websiteUrl !== null
                    ? renderOutboundLink(
                        t('info.website'),
                        cell.websiteUrl,
                        `${testIDPrefix}-website`
                      )
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

        return (
          <AboutPersonRow
            person={cell.person}
            testID={`${testIDPrefix}-person-${cell.person.id}`}
          />
        );
      }}
      style={styles.list}
      testID={`${testIDPrefix}-about`}
    />
  );
}
