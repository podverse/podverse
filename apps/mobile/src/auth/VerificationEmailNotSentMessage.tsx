import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import { ContactEmailText } from '../components/content/ContactEmailText';
import { getMobileConfig } from '../config';
import { typography } from '../theme/typography';
import { useTheme } from '../theme/useTheme';
import { signupSuccessCopy } from './signupVerificationEmailNotice';

type VerificationEmailNotSentMessageProps = {
  contactTestID: string;
  showTitle?: boolean;
  testID: string;
};

export function VerificationEmailNotSentMessage({
  contactTestID,
  showTitle = false,
  testID,
}: VerificationEmailNotSentMessageProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const contactEmail = getMobileConfig().contactEmail;
  const copy = signupSuccessCopy('verification_email_not_sent', contactEmail);
  const body = copy.showContactLink
    ? t('authentication.verification_email_not_sent_body', { email: contactEmail })
    : t('authentication.verification_email_not_sent_body_no_contact');

  const styles = StyleSheet.create({
    body: {
      ...typography.prose,
      color: themeStyles.textPrimary.color,
    },
    emailLink: {
      color: tokens.text.link,
      textDecorationLine: 'underline',
    },
    title: {
      ...typography.subheading,
      color: themeStyles.textPrimary.color,
      marginBottom: tokens.spacing.sm,
    },
  });

  return (
    <View accessibilityLiveRegion="polite">
      {showTitle ? (
        <Text style={styles.title}>{t('authentication.verification_email_not_sent_title')}</Text>
      ) : null}
      <ContactEmailText
        email={copy.showContactLink ? contactEmail : ''}
        linkStyle={styles.emailLink}
        linkTestID={contactTestID}
        style={styles.body}
        testID={testID}
        text={body}
      />
    </View>
  );
}
