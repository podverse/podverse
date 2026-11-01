import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Button, VerticalCenter } from '../primitives';

type ListEmptyProps = {
  messageKey: string;
  testID?: string;
  /**
   * Optional next step, for empty lists the user can act on — "nothing subscribed yet" offering
   * Search. Both props are needed for the button to render; a list that is simply empty says so and
   * stops there.
   */
  actionLabelKey?: string;
  onAction?: () => void;
  /** Defaults to `${testID}-action`. */
  actionTestID?: string;
  /**
   * `center` fills the list body and centers the copy (default).
   * `start` sits under the list header, left-aligned — same placement as web Recommendations empty.
   */
  align?: 'center' | 'start';
};

/**
 * Localized empty-list copy. Pair with FillList when the empty state is the list body;
 * typography matches CallToActionSection.
 */
export function ListEmpty({
  actionLabelKey,
  actionTestID,
  align = 'center',
  messageKey,
  onAction,
  testID = 'list-empty',
}: ListEmptyProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        action: {
          marginTop: tokens.spacing.lg,
          width: '100%',
        },
        content: {
          alignSelf: 'stretch',
          width: '100%',
        },
        message: {
          ...typography.subheading,
          color: themeStyles.textSecondary.color,
          textAlign: 'center',
        },
        messageStart: {
          ...typography.subheading,
          color: themeStyles.textSecondary.color,
          textAlign: 'left',
        },
        startRoot: {
          alignSelf: 'stretch',
          width: '100%',
        },
      }),
    [themeStyles, tokens]
  );

  const showAction = actionLabelKey !== undefined && onAction !== undefined;
  const body = (
    <View style={styles.content}>
      <Text style={align === 'start' ? styles.messageStart : styles.message}>{t(messageKey)}</Text>
      {showAction ? (
        <View style={styles.action}>
          <Button
            fullWidth
            label={t(actionLabelKey)}
            onPress={onAction}
            size="lg"
            testID={actionTestID ?? `${testID}-action`}
            variant="primary"
          />
        </View>
      ) : null}
    </View>
  );

  if (align === 'start') {
    return (
      <View style={styles.startRoot} testID={testID}>
        {body}
      </View>
    );
  }

  return <VerticalCenter testID={testID}>{body}</VerticalCenter>;
}
