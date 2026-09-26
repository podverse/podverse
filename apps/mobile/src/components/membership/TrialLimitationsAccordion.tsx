import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';
import { Accordion } from '../primitives';

const TRIAL_LIMITATION_KEYS = [
  'membership.trial_limitations_directory_add_by_rss',
  'membership.trial_limitations_add_by_rss_feed_limit',
  'membership.trial_limitations_manual_refresh_limit',
  'membership.trial_limitations_stats_tracking',
] as const;

type TrialLimitationsAccordionProps = {
  testID: string;
};

export function TrialLimitationsAccordion({ testID }: TrialLimitationsAccordionProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        bullet: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
        },
        limitationIntro: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
        },
        limitationList: {
          gap: tokens.spacing.sm,
        },
        limitationPanel: {
          gap: tokens.spacing.base,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <Accordion testID={testID} title={t('membership.trial_limitations_title')}>
      <View style={styles.limitationPanel}>
        <Text style={styles.limitationIntro}>{t('membership.trial_limitations_summary')}</Text>
        <View style={styles.limitationList}>
          {TRIAL_LIMITATION_KEYS.map((key) => (
            <Text key={key} style={styles.bullet}>
              {`• ${t(key)}`}
            </Text>
          ))}
        </View>
      </View>
    </Accordion>
  );
}
