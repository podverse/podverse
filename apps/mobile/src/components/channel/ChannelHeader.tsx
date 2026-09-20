import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { CoverImage } from '../primitives';

export type ChannelHeaderProps = {
  /** List-size artwork. Falls back to the title's initials-free placeholder when absent. */
  artworkUri: string | null;
  /** Already-localized. Truncated, with the full text living on the About section. */
  description?: string | null;
  /** Lines of description before truncation. */
  descriptionLines?: number;
  /** Renders under the title — subscribe, plus optional outbound links (RSS, website). */
  actions?: ReactNode;
  /** Already-localized status text under the actions, e.g. a failed follow. */
  notice?: string | null;
  /** Already-localized. Shown under the title, e.g. an author or track count. */
  subtitle?: string | null;
  /** Opens the linked channel when the title is pressed. */
  onTitlePress?: () => void;
  testID?: string;
  title: string;
  /** Largest original for the full-screen viewer. Defaults to `artworkUri`. */
  viewerUri?: string | null;
};

/**
 * Identity block at the top of a channel: art beside the title and subscribe control.
 *
 * Art stays square and opens the viewer on its own. The title column sits to the right so the
 * episode list — the reason the screen was opened — stays closer to the top of the page than a
 * stacked 120px cover would allow.
 *
 * Description is optional. Podcast detail leaves it off because About already holds the full text;
 * other mediums may still pass a short clip when they have no About section yet.
 *
 * Unboxed on purpose: the gutter comes from the host (pinned chrome or a list), so the block reads
 * as the top of the page rather than as a card sitting on it, and the stack title above it is the
 * only chrome.
 */
export function ChannelHeader({
  actions,
  artworkUri,
  description,
  descriptionLines = 4,
  notice,
  onTitlePress,
  subtitle,
  testID,
  title,
  viewerUri,
}: ChannelHeaderProps) {
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        actions: {
          alignItems: 'flex-start',
          marginTop: tokens.spacing.md,
        },
        artwork: {
          height: 78,
          width: 78,
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
        subtitle: {
          ...typography.label,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.xs,
        },
        textColumn: {
          flex: 1,
          minWidth: 0,
        },
        title: {
          ...typography.heading,
          color: themeStyles.textPrimary.color,
        },
      }),
    [themeStyles, tokens]
  );

  const hasDescription = (description ?? '').length > 0;
  const hasSubtitle = (subtitle ?? '').length > 0;
  const hasNotice = (notice ?? '').length > 0;

  return (
    <View testID={testID}>
      <View style={styles.row}>
        <CoverImage
          accessibilityLabel={title}
          fallbackLabel={title}
          style={styles.artwork}
          uri={artworkUri}
          viewerUri={viewerUri}
        />
        <View style={styles.textColumn}>
          {onTitlePress !== undefined ? (
            <Pressable accessibilityLabel={title} accessibilityRole="link" onPress={onTitlePress}>
              <Text
                accessibilityElementsHidden
                importantForAccessibility="no"
                numberOfLines={2}
                style={styles.title}
              >
                {title}
              </Text>
            </Pressable>
          ) : (
            <Text accessibilityRole="header" numberOfLines={2} style={styles.title}>
              {title}
            </Text>
          )}
          {hasSubtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          {actions !== undefined && actions !== null ? (
            <View style={styles.actions}>{actions}</View>
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
