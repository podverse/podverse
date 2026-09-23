import type { ReactNode } from 'react';
import { useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { FillList } from '../primitives';
import { LoadingSection } from '../state/LoadingSection';
import { toAboutFundingLink } from './aboutPerson';

export type FundingLinkSource = {
  id: number;
  title?: string | null;
  url: string;
};

export type FundingLinksSectionProps = {
  fundings: readonly FundingLinkSource[];
  isLoading: boolean;
  /** `inline` paints in a parent list footer. `fill` owns the section scroll. */
  layout?: 'fill' | 'inline';
  listHeader?: ReactNode;
  testIDPrefix: string;
};

/**
 * Funding chip body: one sentence, then the publisher's support links.
 *
 * Channel screens pass `channel_fundings`. Item screens pass `item_fundings` only.
 */
export function FundingLinksSection({
  fundings,
  isLoading,
  layout = 'fill',
  listHeader,
  testIDPrefix,
}: FundingLinksSectionProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        content: {
          paddingBottom: tokens.spacing['2xl'],
          paddingHorizontal: screenBodyInsets(tokens.spacing).paddingHorizontal,
        },
        intro: {
          ...typography.body,
          color: themeStyles.textPrimary.color,
          marginBottom: tokens.spacing.lg,
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
        linkUrl: {
          ...typography.body,
          color: tokens.text.accent,
        },
        links: {
          gap: tokens.spacing.sm,
        },
        list: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
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

  const links = useMemo(
    () =>
      fundings.map((funding) =>
        toAboutFundingLink({
          id: funding.id,
          title: funding.title ?? null,
          url: funding.url,
        })
      ),
    [fundings]
  );

  const openExternalUrl = useCallback(async (href: string) => {
    try {
      await Linking.openURL(href);
    } catch (error) {
      console.warn('Could not open a funding link', href, error);
    }
  }, []);

  const body = isLoading ? (
    <LoadingSection testID={`${testIDPrefix}-funding-loading`} />
  ) : (
    <View style={styles.surface} testID={`${testIDPrefix}-funding`}>
      <Text style={styles.intro} testID={`${testIDPrefix}-funding-intro`}>
        {t('info.funding_support')}
      </Text>
      <View style={styles.links}>
        {links.map((funding) => {
          const label =
            funding.title !== null && funding.title.length > 0 ? funding.title : t('info.funding');
          return (
            <Pressable
              accessibilityLabel={`${label}: ${funding.url}`}
              accessibilityRole="link"
              key={`funding-${funding.id}`}
              onPress={() => {
                void openExternalUrl(funding.url);
              }}
              testID={`${testIDPrefix}-funding-link-${funding.id}`}
            >
              <Text style={styles.linkLine}>
                <Text style={styles.linkLabel}>{`${label}: `}</Text>
                <Text style={styles.linkUrl}>{funding.url}</Text>
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );

  if (layout === 'inline') {
    return (
      <View style={styles.content}>
        {listHeader}
        {body}
      </View>
    );
  }

  return (
    <FillList
      ListHeaderComponent={
        listHeader !== null && listHeader !== undefined ? <>{listHeader}</> : null
      }
      accessibilityLabel={t('info.funding')}
      contentContainerStyle={styles.content}
      data={[{ key: 'body' }]}
      keyExtractor={(cell) => cell.key}
      renderItem={() => body}
      style={styles.list}
      testID={`${testIDPrefix}-funding-list`}
    />
  );
}
