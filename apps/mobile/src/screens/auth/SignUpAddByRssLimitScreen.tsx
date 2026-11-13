import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AccessibilityInfo, StyleSheet, Text, View } from 'react-native';

import { checkSignUpAddByRssLimit } from '../../auth/signUpAddByRssLimitCheck';
import type { SignUpAddByRssLimitGate } from '../../auth/signUpAddByRssLimitGate';
import { ContactEmailText } from '../../components/content/ContactEmailText';
import { FormActions } from '../../components/form';
import { Accordion, Button, CheckboxRow } from '../../components/primitives';
import { HeaderBarChrome } from '../../components/screen/HeaderBarChrome';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { LoadingSection } from '../../components/state/LoadingSection';
import { RetryableError } from '../../components/state/RetryableError';
import { getMobileConfig } from '../../config';
import { useOpmlExport } from '../../hooks/useOpmlExport';
import { SlideUpDismissGesture } from '../../navigation/SlideUpDismissGesture';
import { formActionsTopGap } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useTheme } from '../../theme/useTheme';

type SignUpAddByRssLimitScreenProps = {
  onDismiss: () => void;
  /** Downward drag from the header band. Skips the Modal slide so the drag is the only motion. */
  onDragDismiss: () => void;
  onProceed: (reason: 'accepted' | 'within_limit') => void;
};

type SignUpAddByRssLimitView =
  { kind: 'checking' } | Exclude<SignUpAddByRssLimitGate, { kind: 'sign_up' }>;

const limitCopy = (leaf: string): string => `authentication.signup_add_by_rss_limit.${leaf}`;

export function SignUpAddByRssLimitScreen({
  onDismiss,
  onDragDismiss,
  onProceed,
}: SignUpAddByRssLimitScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const opmlExport = useOpmlExport();
  const [gate, setGate] = useState<SignUpAddByRssLimitView>({ kind: 'checking' });
  const [accepted, setAccepted] = useState(false);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const onProceedRef = useRef(onProceed);
  onProceedRef.current = onProceed;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        accept: {
          marginTop: formActionsTopGap(tokens.spacing),
        },
        actions: {
          marginTop: formActionsTopGap(tokens.spacing),
        },
        contact: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.lg,
        },
        copyStack: {
          gap: tokens.spacing.base,
        },
        details: {
          marginTop: formActionsTopGap(tokens.spacing),
        },
        emailLink: {
          color: tokens.text.link,
          textDecorationLine: 'underline',
        },
        exportButton: {
          marginTop: tokens.spacing.base,
        },
        prose: {
          ...typography.prose,
          color: themeStyles.textPrimary.color,
        },
        root: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
        },
        status: {
          ...typography.body,
          color: themeStyles.textSecondary.color,
          marginTop: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const runCheck = useCallback(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    setGate({ kind: 'checking' });
    void checkSignUpAddByRssLimit()
      .then((result) => {
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }
        if (result.kind === 'sign_up') {
          onProceedRef.current('within_limit');
          return;
        }
        setGate(result);
      })
      .catch((error: unknown) => {
        console.warn('[signup-add-by-rss-limit] check failed', error);
        if (!mountedRef.current || requestId !== requestIdRef.current) {
          return;
        }
        setGate({ kind: 'limit_unavailable' });
      });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    runCheck();
    return () => {
      mountedRef.current = false;
    };
  }, [runCheck]);

  const summaryText =
    gate.kind === 'warn'
      ? t(limitCopy('summary'), { feed_count: gate.feedCount, limit: gate.limit })
      : '';

  useEffect(() => {
    if (gate.kind !== 'warn' || summaryText === '') {
      return;
    }
    AccessibilityInfo.announceForAccessibility(summaryText);
  }, [gate, summaryText]);

  const contactEmail = getMobileConfig().contactEmail;

  return (
    <SlideUpDismissGesture enabled onDismiss={onDragDismiss}>
      <View style={styles.root} testID="signup-add-by-rss-limit-screen">
        <HeaderBarChrome
          backAccessibilityLabel={t('misc.dismiss')}
          backIcon="chevron-down"
          backTestID="auth-dismiss"
          onBack={onDismiss}
          title={gate.kind === 'checking' ? t('authentication.sign_up') : t(limitCopy('title'))}
        />
        {gate.kind === 'checking' ? (
          <LoadingSection testID="signup-add-by-rss-limit-checking" />
        ) : gate.kind === 'limit_unavailable' ? (
          <MobileScreenContainer testID="signup-add-by-rss-limit-body">
            <RetryableError
              errorKey={limitCopy('limit_unavailable')}
              onRetry={runCheck}
              testID="signup-add-by-rss-limit-unavailable"
            />
          </MobileScreenContainer>
        ) : (
          <MobileScreenContainer testID="signup-add-by-rss-limit-body">
            <View style={styles.copyStack}>
              <Text
                accessibilityLiveRegion="polite"
                style={styles.prose}
                testID="signup-add-by-rss-limit-summary"
              >
                {summaryText}
              </Text>
              <Text style={styles.prose}>{t(limitCopy('export_recommendation'))}</Text>
            </View>
            <View style={styles.exportButton}>
              <Button
                disabled={opmlExport.isExporting}
                fullWidth
                label={t('settings.opml.export_button')}
                loading={opmlExport.isExporting}
                onPress={() => {
                  void opmlExport.exportOpml();
                }}
                size="form"
                testID="signup-add-by-rss-limit-export"
                variant="secondary"
              />
            </View>
            {opmlExport.notice !== null ? (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.status}
                testID="signup-add-by-rss-limit-export-notice"
              >
                {t(opmlExport.notice.key, opmlExport.notice.params)}
              </Text>
            ) : null}
            {opmlExport.errorKey !== null ? (
              <Text
                accessibilityLiveRegion="polite"
                style={styles.status}
                testID="signup-add-by-rss-limit-export-error"
              >
                {t(opmlExport.errorKey)}
              </Text>
            ) : null}
            <View style={styles.details}>
              <Accordion
                testID="signup-add-by-rss-limit-details"
                title={t(limitCopy('details_title'))}
              >
                <View style={styles.copyStack}>
                  <Text style={styles.prose}>
                    {t(limitCopy('details_kept'), { limit: gate.limit })}
                  </Text>
                  <Text style={styles.prose} testID="signup-add-by-rss-limit-details-removed">
                    {t(limitCopy('details_removed'))}
                  </Text>
                  <Text style={styles.prose}>{t(limitCopy('details_server'))}</Text>
                  <Text style={styles.prose}>{t(limitCopy('details_subscriptions'))}</Text>
                  <Text style={styles.prose}>
                    {t(limitCopy('details_restore'), { limit: gate.limit })}
                  </Text>
                  <Text style={styles.prose}>{t(limitCopy('details_alternatives'))}</Text>
                </View>
              </Accordion>
            </View>
            {contactEmail !== '' ? (
              <ContactEmailText
                email={contactEmail}
                linkStyle={styles.emailLink}
                linkTestID="signup-add-by-rss-limit-contact-email"
                style={styles.contact}
                testID="signup-add-by-rss-limit-contact"
                text={t(limitCopy('contact'), { email: contactEmail })}
              />
            ) : null}
            <CheckboxRow
              checked={accepted}
              label={t(limitCopy('accept_label'))}
              onPress={() => {
                setAccepted((current) => !current);
              }}
              style={styles.accept}
              testID="signup-add-by-rss-limit-accept"
            />
            <FormActions
              actions={[
                {
                  disabled: !accepted || opmlExport.isExporting,
                  label: t('misc.continue'),
                  onPress: () => {
                    onProceed('accepted');
                  },
                  testID: 'signup-add-by-rss-limit-continue',
                },
              ]}
              style={styles.actions}
            />
          </MobileScreenContainer>
        )}
      </View>
    </SlideUpDismissGesture>
  );
}
