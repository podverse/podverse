import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text } from 'react-native';

import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';
import { isPopularityTrackingAllowed, isPopularityTrackingPromptRequired } from '@podverse/helpers';

import { useAuth } from '../auth/AuthProvider';
import { requestWithMobileAuthRefresh } from '../auth/authRequestWithRefresh';
import { syncAllowListenStatsToAccountSettings } from '../auth/syncAccountPrefs';
import { ModalSafeArea } from '../components/screen/ModalSafeArea';
import { screenBodyInsets } from '../theme/screenLayout';
import { useTheme } from '../theme/useTheme';
import { PopularityTrackingAgreementBody } from './PopularityTrackingAgreementBody';
import { setPopularityTrackingCurrentVersion } from './popularityTrackingGate';

export function PopularityTrackingProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, account, clearSession, refreshToken, setAccount, setTokens, status } =
    useAuth();
  const [agreement, setAgreement] = useState<DTOPopularityTrackingAgreement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const currentVersion = agreement?.version ?? '';
  const accountSettings = account?.account_settings ?? null;
  const neverDecided =
    accountSettings?.listen_stats_accepted === null ||
    accountSettings?.listen_stats_accepted === undefined;
  // The account snapshot carries the decision, so the prompt waits for it. `status` turns
  // authenticated the moment tokens are stored, well before the snapshot arrives, and an
  // account that has not loaded is not an account that has declined to decide.
  const promptRequired =
    status === 'authenticated' &&
    account !== null &&
    (currentVersion !== ''
      ? isPopularityTrackingPromptRequired(accountSettings, currentVersion)
      : neverDecided);

  const loadAgreement = useCallback(() => {
    if (status !== 'authenticated' || accessToken === null) {
      setAgreement(null);
      setPopularityTrackingCurrentVersion('');
      setIsLoading(false);
      setErrorKey(null);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    let cancelled = false;
    void requestWithMobileAuthRefresh(
      { accessToken, clearSession, refreshToken, setTokens },
      (api) => api.reqLegalPopularityTracking()
    )
      .then((data) => {
        if (cancelled) {
          return;
        }
        setAgreement(data);
        setPopularityTrackingCurrentVersion(data.version);
        setErrorKey(null);
      })
      .catch((error: unknown) => {
        console.warn('[PopularityTrackingProvider] load failed', error);
        if (!cancelled) {
          setErrorKey('errors.generic');
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, clearSession, refreshToken, setTokens, status]);

  useEffect(() => {
    const cleanup = loadAgreement();
    return cleanup;
  }, [loadAgreement]);

  const handleDecision = useCallback(
    async (accepted: boolean) => {
      await syncAllowListenStatsToAccountSettings({
        accepted,
        auth: { accessToken, clearSession, refreshToken, setTokens },
        setAccount,
      });
    },
    [accessToken, clearSession, refreshToken, setAccount, setTokens]
  );

  const alreadyAgreed = isPopularityTrackingAllowed(account?.account_settings, currentVersion);

  return (
    <>
      {children}
      <Modal animationType="fade" visible={promptRequired} presentationStyle="fullScreen">
        <ModalSafeArea testID="popularity-tracking-prompt">
          <ScrollView
            contentContainerStyle={[
              styles.body,
              screenBodyInsets(tokens.spacing),
              { paddingBottom: tokens.spacing['2xl'] },
            ]}
          >
            <Text style={[styles.title, { color: themeStyles.textPrimary.color }]}>
              {t('popularity_tracking.title')}
            </Text>
            <PopularityTrackingAgreementBody
              alreadyAgreed={alreadyAgreed}
              agreement={agreement}
              errorKey={errorKey}
              isLoading={isLoading}
              learnMoreTestID="popularity-tracking-learn-more"
              noTestID="popularity-tracking-no"
              onDecision={(accepted) => {
                void handleDecision(accepted);
              }}
              onRetry={loadAgreement}
              yesTestID="popularity-tracking-yes"
            />
          </ScrollView>
        </ModalSafeArea>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
});
