import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import type { ThemedStylesTheme } from '../../theme/useThemedStyles';
import { useThemedStyles } from '../../theme/useThemedStyles';
import { ListFilterField } from '../form/ListFilterField';
import { Button } from '../primitives/Button';

export type TranscriptFollowBarProps = {
  autoScrollOn: boolean;
  filterTestID: string;
  onChangeFilterTerm: (term: string) => void;
  onToggleAutoScroll: () => void;
  paddingHorizontal?: number;
  term: string;
  toggleTestID: string;
};

const createStyles = ({ tokens }: ThemedStylesTheme) =>
  StyleSheet.create({
    filter: {
      flex: 1,
      minWidth: 0,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.base,
      paddingBottom: tokens.spacing.base,
    },
  });

/**
 * FlatList sticky index for the follow bar when the list also has ListHeaderComponent.
 * Index 0 is that header; the follow bar is the first data row.
 */
export const TRANSCRIPT_FOLLOW_BAR_STICKY_INDEX = 1;

/**
 * Sticky transcript toolbar: free-text body filter on the left, Autoscroll On/Off on the right.
 */
export function TranscriptFollowBar({
  autoScrollOn,
  filterTestID,
  onChangeFilterTerm,
  onToggleAutoScroll,
  paddingHorizontal,
  term,
  toggleTestID,
}: TranscriptFollowBarProps) {
  const { t } = useTranslation();
  const styles = useThemedStyles(createStyles);
  const filterLabel = t('info.transcript.search_transcript');
  const toggleLabel = autoScrollOn
    ? t('misc.autoscroll.autoscroll_on')
    : t('misc.autoscroll.autoscroll_off');

  return (
    <View style={[styles.row, { paddingHorizontal: paddingHorizontal ?? 0 }]}>
      <ListFilterField
        label={filterLabel}
        onChangeTerm={onChangeFilterTerm}
        placeholder={filterLabel}
        style={styles.filter}
        term={term}
        testID={filterTestID}
      />
      <Button
        label={toggleLabel}
        onPress={onToggleAutoScroll}
        size="sm"
        testID={toggleTestID}
        variant="outline"
      />
    </View>
  );
}
