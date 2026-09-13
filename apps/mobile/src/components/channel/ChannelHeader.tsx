import type { ReactNode } from 'react';
import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

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
  /** Renders under the title — the subscribe control, and whatever sits beside it. */
  actions?: ReactNode;
  /** Already-localized status text under the actions, e.g. a failed follow. */
  notice?: string | null;
  /** Already-localized. Shown under the title, e.g. an author or track count. */
  subtitle?: string | null;
  testID?: string;
  title: string;
  /** Largest original for the full-screen viewer. Defaults to `artworkUri`. */
  viewerUri?: string | null;
};

/**
 * Identity block at the top of a channel: art, title, the subscribe control, and enough of the
 * description to know what the channel is.
 *
 * The description is deliberately clipped rather than expandable here. A header that can grow to
 * several screens pushes the episode list — the reason the screen was opened — off the bottom,
 * so the full text belongs on its own section instead.
 *
 * Art stays square and opens the viewer on its own, so the header does not need to be pressable to
 * make the artwork reachable.
 *
 * Unboxed on purpose: the gutter comes from the list hosting it, so the block reads as the top of
 * the page rather than as a card sitting on it, and the stack title above it is the only chrome.
 */
export function ChannelHeader({
  actions,
  artworkUri,
  description,
  descriptionLines = 4,
  notice,
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
          marginTop: tokens.spacing.md,
        },
        artwork: {
          height: 120,
          marginBottom: tokens.spacing.md,
          width: 120,
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
        subtitle: {
          ...typography.label,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.xs,
        },
        title: {
          ...typography.title,
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
      <CoverImage
        accessibilityLabel={title}
        fallbackLabel={title}
        style={styles.artwork}
        uri={artworkUri}
        viewerUri={viewerUri}
      />
      <Text accessibilityRole="header" style={styles.title}>
        {title}
      </Text>
      {hasSubtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {hasDescription ? (
        <Text numberOfLines={descriptionLines} style={styles.description}>
          {description}
        </Text>
      ) : null}
      {actions !== undefined && actions !== null ? (
        <View style={styles.actions}>{actions}</View>
      ) : null}
      {hasNotice ? <Text style={styles.notice}>{notice}</Text> : null}
    </View>
  );
}
