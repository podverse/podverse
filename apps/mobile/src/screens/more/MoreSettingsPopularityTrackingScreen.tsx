import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';
import { isPopularityTrackingAllowed } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { syncAllowListenStatsToAccountSettings } from '../../auth/syncAccountPrefs';
import { ToggleSwitch } from '../../components/primitives/ToggleSwitch';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { PopularityTrackingAgreementBody } from '../../popularityTracking/PopularityTrackingAgreementBody';
import { getPopularityTrackingCurrentVersion } from '../../popularityTracking/popularityTrackingGate';
import { useTheme } from '../../theme/useTheme';

export function MoreSettingsPopularityTrackingScreen() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, account, clearSession, refreshToken, setAccount, setTokens } = useAuth();
  const [agreement, setAgreement] = useState<DTOPopularityTrackingAgreement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const currentVersion = agreement?.version ?? getPopularityTrackingCurrentVersion();
  const allowed = isPopularityTrackingAllowed(account?.account_settings, currentVersion);

  const loadAgreement = useCallback(() => {
    setIsLoading(true);
    setErrorKey(null);
    let cancelled = false;
    void requestWithMobileAuthRefresh(
      { accessToken, clearSession, refreshToken, setTokens },
      (api) => api.reqLegalPopularityTracking()
    )
      .then((data) => {
        if (!cancelled) {
          setAgreement(data);
          setErrorKey(null);
        }
      })
      .catch((error: unknown) => {
        console.warn('[MoreSettingsPopularityTrackingScreen] load failed', error);
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
  }, [accessToken, clearSession, refreshToken, setTokens]);

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

  const styles = StyleSheet.create({
    label: {
      color: themeStyles.textPrimary.color,
      flex: 1,
    },
    row: {
      alignItems: 'center',
      flexDirection: 'row',
      gap: tokens.spacing.md,
      marginBottom: tokens.spacing.lg,
    },
  });

  return (
    <MobileScreenContainer testID="more-settings-popularity-tracking-screen">
      <View style={styles.row}>
        <Text style={styles.label}>{t('popularity_tracking.title')}</Text>
        <ToggleSwitch
          accessibilityLabel={t('popularity_tracking.title')}
          onValueChange={(next) => {
            if (!next) {
              setReviewing(false);
              void handleDecision(false);
              return;
            }
            setReviewing(true);
          }}
          testID="more-settings-popularity-tracking-switch"
          value={allowed || reviewing}
        />
      </View>
      {reviewing ? (
        <PopularityTrackingAgreementBody
          accordionTestID="popularity-tracking-settings-full-agreement"
          agreement={agreement}
          errorKey={errorKey}
          isLoading={isLoading}
          noTestID="popularity-tracking-settings-no"
          onDecision={(accepted) => {
            setReviewing(false);
            void handleDecision(accepted);
          }}
          onRetry={loadAgreement}
          yesTestID="popularity-tracking-settings-yes"
        />
      ) : null}
    </MobileScreenContainer>
  );
}
