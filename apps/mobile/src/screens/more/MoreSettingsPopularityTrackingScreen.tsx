import { useCallback, useEffect, useState } from 'react';

import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';
import { isPopularityTrackingAllowed } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { syncAllowListenStatsToAccountSettings } from '../../auth/syncAccountPrefs';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { PopularityTrackingAgreementBody } from '../../popularityTracking/PopularityTrackingAgreementBody';
import { getPopularityTrackingCurrentVersion } from '../../popularityTracking/popularityTrackingGate';

export function MoreSettingsPopularityTrackingScreen() {
  const { accessToken, account, clearSession, refreshToken, setAccount, setTokens } = useAuth();
  const [agreement, setAgreement] = useState<DTOPopularityTrackingAgreement | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const currentVersion = agreement?.version ?? getPopularityTrackingCurrentVersion();
  const alreadyAgreed = isPopularityTrackingAllowed(account?.account_settings, currentVersion);

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

  return (
    <MobileScreenContainer testID="more-settings-popularity-tracking-screen">
      <PopularityTrackingAgreementBody
        alreadyAgreed={alreadyAgreed}
        agreement={agreement}
        errorKey={errorKey}
        isLoading={isLoading}
        learnMoreTestID="popularity-tracking-settings-learn-more"
        noTestID="popularity-tracking-settings-no"
        onDecision={(accepted) => {
          void handleDecision(accepted);
        }}
        onRetry={loadAgreement}
        yesTestID="popularity-tracking-settings-yes"
      />
    </MobileScreenContainer>
  );
}
