import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { decodeHtmlEntities } from '@podverse/helpers/html';

import { typography } from '../../theme/typography';
import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';

export type TranscriptListRowProps = {
  body: string;
  /** When true, the body uses the playing highlight color. Speaker and time keep their colors. */
  highlighted?: boolean;
  paddingHorizontal?: number;
  speaker?: string;
  startTimeFormatted: string | null;
  testID?: string;
};

const createStyles = ({ styles: themeStyles, tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    body: {
      ...typography.body,
      color: themeStyles.textPrimary.color,
      flex: 1,
      fontWeight: '300',
    },
    bodyHighlighted: {
      color: tokens.text.highlighted,
    },
    main: {
      flexDirection: 'row',
      gap: tokens.spacing.lg,
      justifyContent: 'space-between',
    },
    row: {
      paddingVertical: tokens.spacing.md,
    },
    speaker: {
      ...typography.body,
      color: tokens.text.link,
      fontWeight: '500',
      marginBottom: tokens.spacing.xs,
    },
    time: {
      ...typography.body,
      color: themeStyles.textSecondary.color,
      fontWeight: '300',
      marginHorizontal: tokens.spacing.base,
    },
  });

/**
 * One transcript cue: optional speaker, body text, and start time. Used on the full player and
 * episode / track detail panes. Cues share one column, separated by vertical padding.
 * Seek-on-tap is not wired.
 */
export const TranscriptListRow = memo(function TranscriptListRow({
  body,
  highlighted = false,
  paddingHorizontal,
  speaker,
  startTimeFormatted,
  testID,
}: TranscriptListRowProps) {
  const styles = useThemedStyles(createStyles);
  const decodedBody = decodeHtmlEntities(body);
  const speakerLabel =
    speaker !== undefined && speaker !== null && speaker.length > 0 ? speaker : null;

  return (
    <View
      accessibilityState={highlighted ? { selected: true } : undefined}
      style={[styles.row, { paddingHorizontal: paddingHorizontal ?? 0 }]}
    >
      {speakerLabel !== null ? <Text style={styles.speaker}>{speakerLabel}</Text> : null}
      <View style={styles.main}>
        <Text
          style={[styles.body, highlighted ? styles.bodyHighlighted : null]}
          testID={testID}
        >
          {decodedBody}
        </Text>
        {startTimeFormatted !== null && startTimeFormatted.length > 0 ? (
          <Text style={styles.time}>{startTimeFormatted}</Text>
        ) : null}
      </View>
    </View>
  );
});
