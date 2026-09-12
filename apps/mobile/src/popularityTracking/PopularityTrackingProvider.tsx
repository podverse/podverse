import type { PropsWithChildren } from 'react';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';
import { isPopularityTrackingAllowed, isPopularityTrackingPromptRequired } from '@podverse/helpers';

import { useAuth } from '../auth/AuthProvider';
import { createMobileApiRequestService } from '../auth/mobileApi';
import { syncAllowListenStatsToAccountSettings } from '../auth/syncAccountPrefs';
import { useTheme } from '../theme/useTheme';
import { PopularityTrackingAgreementBody } from './PopularityTrackingAgreementBody';
import { setPopularityTrackingCurrentVersion } from './popularityTrackingGate';

export function PopularityTrackingProvider({ children }: PropsWithChildren) {
  const { t } = useTranslation();
  const { styles: themeStyles } = useTheme();
  const { accessToken, account, setAccount, status } = useAuth();
  const [agreement, setAgreement] = useState<DTOPopularityTrackingAgreement | null>(null);

  const currentVersion = agreement?.version ?? '';
  const neverDecided =
    account?.account_settings?.listen_stats_accepted === null ||
    account?.account_settings?.listen_stats_accepted === undefined;
  const promptRequired =
    status === 'authenticated' &&
    (currentVersion !== ''
      ? isPopularityTrackingPromptRequired(account?.account_settings, currentVersion)
      : neverDecided);

  useEffect(() => {
    if (status !== 'authenticated' || accessToken === null) {
      setAgreement(null);
      setPopularityTrackingCurrentVersion('');
      return;
    }

    const api = createMobileApiRequestService(accessToken);
    if (api === null) {
      return;
    }

    let cancelled = false;
    void api
      .reqLegalPopularityTracking()
      .then((data) => {
        if (cancelled) {
          return;
        }
        setAgreement(data);
        setPopularityTrackingCurrentVersion(data.version);
      })
      .catch((error: unknown) => {
        console.warn('[PopularityTrackingProvider] load failed', error);
      });

    return () => {
      cancelled = true;
    };
  }, [accessToken, status]);

  const handleDecision = useCallback(
    async (accepted: boolean) => {
      await syncAllowListenStatsToAccountSettings({
        accepted,
        accessToken,
        setAccount,
      });
    },
    [accessToken, setAccount]
  );

  const alreadyAgreed = isPopularityTrackingAllowed(account?.account_settings, currentVersion);

  return (
    <>
      {children}
      <Modal animationType="fade" visible={promptRequired} presentationStyle="fullScreen">
        <SafeAreaView
          style={[styles.root, { backgroundColor: themeStyles.screen.backgroundColor }]}
        >
          <ScrollView contentContainerStyle={styles.body}>
            <Text style={[styles.title, { color: themeStyles.textPrimary.color }]}>
              {t('popularity_tracking.title')}
            </Text>
            <PopularityTrackingAgreementBody
              alreadyAgreed={alreadyAgreed}
              agreement={agreement}
              learnMoreTestID="popularity-tracking-learn-more"
              noTestID="popularity-tracking-no"
              onDecision={(accepted) => {
                void handleDecision(accepted);
              }}
              yesTestID="popularity-tracking-yes"
            />
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  body: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  root: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
});
