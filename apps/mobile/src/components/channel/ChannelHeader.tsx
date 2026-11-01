import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { CHANNEL_HEADER_SETTINGS_ICON_SIZE } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { CoverImage } from '../primitives';
import { HeaderBarAction } from '../screen/HeaderBarAction';

/** Square art beside the title. Shared by the style and the iOS thumbnail decode edge. */
const CHANNEL_HEADER_ARTWORK_EDGE = 78;

/**
 * Heading size at a shorter line height. Two lines are 44pt, and the subscribe control is about
 * 26pt, so both fit in the artwork with a gap between them. The font size stays the heading size.
 */
const CHANNEL_HEADER_TITLE_LINE_HEIGHT = 22;

const CHANNEL_HEADER_TITLE_MAX_LINES = 2;

type ChannelHeaderSettings = {
  accessibilityLabel: string;
  onPress: () => void;
  selected: boolean;
  testID: string;
};

type ChannelHeaderNotifications = {
  accessibilityLabel: string;
  enabled: boolean;
  onPress: () => void;
  testID: string;
};

/** Turns the subtitle into a link, e.g. a track's verified artists. */
export type ChannelHeaderSubtitleLink = {
  accessibilityLabel: string;
  onPress: () => void;
  testID: string;
};

export type ChannelHeaderProps = {
  /** List-size artwork. Missing art uses the shared headphone placeholder. */
  artworkUri: string | null;
  /** Feed URL for protected add-by-RSS artwork. Forwarded to `CoverImage`. */
  artworkAddByRssFeedUrl?: string | null;
  /** Request headers for that artwork. Forwarded to `CoverImage`. */
  artworkHeaders?: Record<string, string>;
  /** Already-localized. Truncated, with the full text living on the About section. */
  description?: string | null;
  /** Lines of description before truncation. */
  descriptionLines?: number;
  /** Leading controls in the action row — typically subscribe. RSS and website live on About. */
  actions?: ReactNode;
  /** Already-localized status text under the actions, e.g. a failed follow. */
  notice?: string | null;
  /** Already-localized. Shown under the title, e.g. an author or track count. */
  subtitle?: string | null;
  /** Makes the subtitle a link. Omit for plain text. */
  subtitleLink?: ChannelHeaderSubtitleLink;
  /** Opens the linked channel when the title is pressed. */
  onTitlePress?: () => void;
  /**
   * Bell at the trailing end of the action row, in line with the gear. Podcast, album, and
   * artist use it to turn notifications for that channel on or off. Omit it on item headers.
   */
  notifications?: ChannelHeaderNotifications;
  /**
   * Gear at the top right of the title row. Podcast, album, and artist use it for channel
   * settings. Omit it on item headers.
   */
  settings?: ChannelHeaderSettings;
  testID?: string;
  title: string;
  /** Largest original for the full-screen viewer. Defaults to `artworkUri`. */
  viewerUri?: string | null;
};

type ChannelHeaderTitleRowProps = {
  onTitlePress?: () => void;
  settings?: ChannelHeaderSettings;
  subtitle?: string | null;
  subtitleLink?: ChannelHeaderSubtitleLink;
  title: string;
  titleLines: number;
};

/**
 * Title row: the name, then the settings gear. The name ellipsizes after `titleLines` and stops
 * short of the gear. A subtitle sits under the name in this same group.
 */
function ChannelHeaderTitleRow({
  onTitlePress,
  settings,
  subtitle,
  subtitleLink,
  title,
  titleLines,
}: ChannelHeaderTitleRowProps) {
  const { styles: themeStyles, tokens } = useTheme();
  const hasSubtitle = (subtitle ?? '').length > 0;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        gear: {
          flexShrink: 0,
        },
        group: {
          gap: tokens.spacing.xs,
          minWidth: 0,
        },
        subtitle: {
          ...typography.label,
          color: themeStyles.textSecondary.color,
        },
        subtitleLink: {
          ...typography.label,
          color: tokens.text.accent,
        },
        title: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
          fontWeight: '400',
          includeFontPadding: false,
          lineHeight: CHANNEL_HEADER_TITLE_LINE_HEIGHT,
        },
        titleFlex: {
          flex: 1,
          minWidth: 0,
        },
        titlePress: {
          alignSelf: 'stretch',
        },
        titleRow: {
          alignItems: 'flex-start',
          flexDirection: 'row',
          gap: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const titleText = (
    <Text
      accessibilityElementsHidden={onTitlePress !== undefined}
      accessibilityRole={onTitlePress !== undefined ? undefined : 'header'}
      ellipsizeMode="tail"
      importantForAccessibility={onTitlePress !== undefined ? 'no' : undefined}
      numberOfLines={titleLines}
      style={styles.title}
    >
      {title}
    </Text>
  );

  return (
    <View style={styles.group}>
      <View style={styles.titleRow}>
        <View style={styles.titleFlex}>
          {onTitlePress !== undefined ? (
            <Pressable
              accessibilityLabel={title}
              accessibilityRole="link"
              onPress={onTitlePress}
              style={styles.titlePress}
            >
              {titleText}
            </Pressable>
          ) : (
            titleText
          )}
        </View>
        {settings !== undefined ? (
          <View style={styles.gear}>
            <HeaderBarAction
              accessibilityLabel={settings.accessibilityLabel}
              icon={settings.selected ? 'settings' : 'settings-outline'}
              iconSize={CHANNEL_HEADER_SETTINGS_ICON_SIZE}
              layout="inline"
              onPress={settings.onPress}
              selected={settings.selected}
              testID={settings.testID}
            />
          </View>
        ) : null}
      </View>
      {hasSubtitle ? (
        subtitleLink !== undefined ? (
          <Pressable
            accessibilityLabel={subtitleLink.accessibilityLabel}
            accessibilityRole="link"
            onPress={subtitleLink.onPress}
            style={({ pressed }) => [styles.titlePress, pressed ? { opacity: 0.6 } : null]}
            testID={subtitleLink.testID}
          >
            <Text numberOfLines={1} style={styles.subtitleLink}>
              {subtitle}
            </Text>
          </Pressable>
        ) : (
          <Text style={styles.subtitle}>{subtitle}</Text>
        )
      ) : null}
    </View>
  );
}

/**
 * Action row under the title. Subscribe stays packed at the leading edge, and any sibling the
 * caller puts beside it uses the same gap. The notification bell, when set, is the trailing
 * control on this row so it lines up with the gear.
 */
function ChannelHeaderActionRow({
  actions,
  notifications,
}: {
  actions: ReactNode;
  notifications?: ChannelHeaderNotifications;
}) {
  const { tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        bell: {
          flexShrink: 0,
        },
        leading: {
          alignItems: 'center',
          flexDirection: 'row',
          flexShrink: 1,
          gap: tokens.spacing.md,
          minWidth: 0,
        },
        row: {
          alignItems: 'center',
          flexDirection: 'row',
          flexShrink: 0,
          gap: tokens.spacing.md,
        },
        rowBetween: {
          justifyContent: 'space-between',
        },
        rowEnd: {
          justifyContent: 'flex-end',
        },
      }),
    [tokens]
  );

  const hasActions = actions !== undefined && actions !== null;
  const bell =
    notifications !== undefined ? (
      <View style={styles.bell}>
        <HeaderBarAction
          accessibilityLabel={notifications.accessibilityLabel}
          icon={notifications.enabled ? 'notifications' : 'notifications-off-outline'}
          iconSize={CHANNEL_HEADER_SETTINGS_ICON_SIZE}
          layout="inline"
          onPress={notifications.onPress}
          testID={notifications.testID}
        />
      </View>
    ) : null;

  if (notifications !== undefined && hasActions) {
    return (
      <View style={[styles.row, styles.rowBetween]}>
        <View style={styles.leading}>{actions}</View>
        {bell}
      </View>
    );
  }

  if (notifications !== undefined) {
    return <View style={[styles.row, styles.rowEnd]}>{bell}</View>;
  }

  return <View style={styles.row}>{actions}</View>;
}

/**
 * Identity block at the top of a channel: art beside a title row and an action row.
 *
 * Art stays square and opens the viewer on its own. The text column sits to the right so the
 * episode list — the reason the screen was opened — stays closer to the top of the page than a
 * stacked 120px cover would allow.
 *
 * When the action row is present, the column is the artwork's height. The title row stays at the
 * top and the action row stays on the bottom edge, so a one-line title and a two-line title keep
 * subscribe in the same place. A subtitle shares the title row's height, and the title is then
 * one line, so the action row still lands on that edge.
 *
 * Description is optional. Podcast detail leaves it off because About already holds the full text;
 * other mediums may still pass a short clip when they have no About section yet.
 *
 * Unboxed on purpose: the gutter comes from the host (pinned chrome or a list), so the block reads
 * as the top of the page rather than as a card sitting on it, and the stack title above it is the
 * only chrome. When `settings` is set, the gear sits at the top right of the title row. When
 * `notifications` is set, the bell sits at the trailing end of the action row.
 */
export function ChannelHeader({
  actions,
  artworkAddByRssFeedUrl,
  artworkHeaders,
  artworkUri,
  description,
  descriptionLines = 4,
  notice,
  notifications,
  onTitlePress,
  settings,
  subtitle,
  subtitleLink,
  testID,
  title,
  viewerUri,
}: ChannelHeaderProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          height: CHANNEL_HEADER_ARTWORK_EDGE,
          width: CHANNEL_HEADER_ARTWORK_EDGE,
        },
        description: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.sm,
        },
        notice: {
          ...typography.caption,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.sm,
        },
        row: {
          alignItems: 'flex-start',
          flexDirection: 'row',
          // Wider than list-row art→text so the 78px header mark breathes beside the title stack.
          gap: tokens.spacing.lg,
        },
        textColumn: {
          flex: 1,
          minWidth: 0,
        },
        textColumnLocked: {
          height: CHANNEL_HEADER_ARTWORK_EDGE,
          justifyContent: 'space-between',
        },
      }),
    [themeStyles, tokens]
  );

  const hasDescription = (description ?? '').length > 0;
  const hasSubtitle = (subtitle ?? '').length > 0;
  const hasNotice = (notice ?? '').length > 0;
  const hasActions = actions !== undefined && actions !== null;
  const lockTextColumn = hasActions || notifications !== undefined;
  const titleLines = lockTextColumn && hasSubtitle ? 1 : CHANNEL_HEADER_TITLE_MAX_LINES;

  return (
    <View testID={testID}>
      <View style={styles.row}>
        <CoverImage
          accessibilityLabel={title}
          addByRssFeedUrl={artworkAddByRssFeedUrl}
          decodeEdge={CHANNEL_HEADER_ARTWORK_EDGE}
          headers={artworkHeaders}
          style={styles.artwork}
          uri={artworkUri}
          viewerUri={viewerUri}
        />
        <View
          style={lockTextColumn ? [styles.textColumn, styles.textColumnLocked] : styles.textColumn}
        >
          <ChannelHeaderTitleRow
            onTitlePress={onTitlePress}
            settings={settings}
            subtitle={hasSubtitle ? subtitle : null}
            subtitleLink={hasSubtitle ? subtitleLink : undefined}
            title={title}
            titleLines={titleLines}
          />
          {lockTextColumn ? (
            <ChannelHeaderActionRow actions={actions} notifications={notifications} />
          ) : null}
        </View>
      </View>
      {hasDescription ? (
        <Text numberOfLines={descriptionLines} style={styles.description}>
          {description}
        </Text>
      ) : null}
      {hasNotice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}
