import { memo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type {
  AddByRssCredentialsNeed,
  AddByRssNeedsCredentialsFeed,
} from '../../lib/addByRss/credentials';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { ListRow } from '../primitives/ListRow';
import { SectionHeading } from '../section/SectionHeading';

export type AddByRssNeedsCredentialsItem = AddByRssNeedsCredentialsFeed<MobileAddByRSSFeedRecord>;

const NEED_SUBTITLE_KEYS: Record<AddByRssCredentialsNeed, string> = {
  missing: 'features.add_by_rss.needs_credentials_missing',
  rejected: 'features.add_by_rss.needs_credentials_rejected',
};

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    divider: {
      backgroundColor: themeStyles.border.borderColor,
      height: StyleSheet.hairlineWidth,
    },
    heading: {
      paddingBottom: tokens.spacing.sm,
      paddingTop: tokens.spacing.lg,
    },
    rowDivider: {
      borderBottomColor: themeStyles.border.borderColor,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
  });

type AddByRssNeedsCredentialsRowProps = {
  isLast: boolean;
  item: AddByRssNeedsCredentialsItem;
  onPress: (feed: MobileAddByRSSFeedRecord) => void;
  testIDPrefix: string;
};

/** One feed waiting on a username and password. Tapping it opens the credentials screen. */
export const AddByRssNeedsCredentialsRow = memo(function AddByRssNeedsCredentialsRow({
  isLast,
  item,
  onPress,
  testIDPrefix,
}: AddByRssNeedsCredentialsRowProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const { feed, need } = item;
  const handlePress = useCallback(() => {
    onPress(feed);
  }, [feed, onPress]);

  return (
    <View style={isLast ? undefined : styles.rowDivider}>
      <ListRow
        onPress={handlePress}
        subtitle={t(NEED_SUBTITLE_KEYS[need])}
        subtitleTestID={`${testIDPrefix}-needs-credentials-subtitle-${feed.idText}`}
        testID={`${testIDPrefix}-needs-credentials-row-${feed.idText}`}
        title={feed.title ?? feed.feedUrl}
      />
    </View>
  );
});

type AddByRssNeedsCredentialsHeadingProps = {
  testIDPrefix: string;
};

export function AddByRssNeedsCredentialsHeading({
  testIDPrefix,
}: AddByRssNeedsCredentialsHeadingProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);

  return (
    <SectionHeading style={styles.heading} testID={`${testIDPrefix}-needs-credentials-title`}>
      {t('features.add_by_rss.needs_credentials_section_title')}
    </SectionHeading>
  );
}

type AddByRssNeedsCredentialsSectionProps = {
  items: readonly AddByRssNeedsCredentialsItem[];
  onPressFeed: (feed: MobileAddByRSSFeedRecord) => void;
  /** Draw a rule above the heading when rows sit directly above the section. */
  showDivider: boolean;
  testIDPrefix: string;
};

/**
 * The end-of-list section for add-by-RSS feeds that need a username and password on this device.
 * Rendered as a list footer, so it only ever holds the handful of feeds in that state.
 */
export function AddByRssNeedsCredentialsSection({
  items,
  onPressFeed,
  showDivider,
  testIDPrefix,
}: AddByRssNeedsCredentialsSectionProps) {
  const styles = useThemedStyles(createStyles);
  if (items.length === 0) {
    return null;
  }

  return (
    <View testID={`${testIDPrefix}-needs-credentials`}>
      {showDivider ? <View style={styles.divider} /> : null}
      <AddByRssNeedsCredentialsHeading testIDPrefix={testIDPrefix} />
      {items.map((item, index) => (
        <AddByRssNeedsCredentialsRow
          isLast={index === items.length - 1}
          item={item}
          key={item.feed.idText}
          onPress={onPressFeed}
          testIDPrefix={testIDPrefix}
        />
      ))}
    </View>
  );
}
