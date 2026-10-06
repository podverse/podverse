import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Linking, StyleSheet, Text, View } from 'react-native';
import type { TextStyle } from 'react-native';

import { getMobileConfig } from '../../config';
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

type MissingContentBulletProps = {
  emailLinkStyle: TextStyle;
  textStyle: TextStyle;
};

function MissingContentBullet({ emailLinkStyle, textStyle }: MissingContentBulletProps) {
  const { t } = useTranslation();
  const email = getMobileConfig().contactEmail;
  const message = t('membership.trial_limitations_missing_content', { email });
  const emailIndex = email === '' ? -1 : message.indexOf(email);

  if (emailIndex < 0) {
    return (
      <Text style={textStyle} testID="trial-limitations-missing-content">
        {`• ${message}`}
      </Text>
    );
  }

  const before = message.slice(0, emailIndex);
  const after = message.slice(emailIndex + email.length);

  return (
    <Text style={textStyle} testID="trial-limitations-missing-content">
      {`• ${before}`}
      <Text
        accessibilityRole="link"
        onPress={() => {
          void Linking.openURL(`mailto:${email}`);
        }}
        style={emailLinkStyle}
        testID="trial-limitations-missing-content-email"
      >
        {email}
      </Text>
      {after}
    </Text>
  );
}

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
        emailLink: {
          color: tokens.text.accent,
          textDecorationLine: 'underline',
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
          <MissingContentBullet emailLinkStyle={styles.emailLink} textStyle={styles.bullet} />
        </View>
      </View>
    </Accordion>
  );
}
