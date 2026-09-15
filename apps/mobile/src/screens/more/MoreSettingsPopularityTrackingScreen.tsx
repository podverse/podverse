import { useCallback, useEffect, useState } from 'react';

import type { DTOPopularityTrackingAgreement } from '@podverse/helpers';
import { isPopularityTrackingAllowed } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { createMobileApiRequestService } from '../../auth/mobileApi';
import { syncAllowListenStatsToAccountSettings } from '../../auth/syncAccountPrefs';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { PopularityTrackingAgreementBody } from '../../popularityTracking/PopularityTrackingAgreementBody';
import { getPopularityTrackingCurrentVersion } from '../../popularityTracking/popularityTrackingGate';

export function MoreSettingsPopularityTrackingScreen() {
  const { accessToken, account, setAccount } = useAuth();
  const [agreement, setAgreement] = useState<DTOPopularityTrackingAgreement | null>(null);
  const currentVersion = agreement?.version ?? getPopularityTrackingCurrentVersion();
  const alreadyAgreed = isPopularityTrackingAllowed(account?.account_settings, currentVersion);

  useEffect(() => {
    const api = createMobileApiRequestService(accessToken);
    if (api === null) {
      return;
    }
    let cancelled = false;
    void api
      .reqLegalPopularityTracking()
      .then((data) => {
        if (!cancelled) {
          setAgreement(data);
        }
      })
      .catch((error: unknown) => {
        console.warn('[MoreSettingsPopularityTrackingScreen] load failed', error);
      });
    return () => {
      cancelled = true;
    };
  }, [accessToken]);

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

  return (
    <MobileScreenContainer testID="more-settings-popularity-tracking-screen">
      <PopularityTrackingAgreementBody
        alreadyAgreed={alreadyAgreed}
        agreement={agreement}
        learnMoreTestID="popularity-tracking-settings-learn-more"
        noTestID="popularity-tracking-settings-no"
        onDecision={(accepted) => {
          void handleDecision(accepted);
        }}
        yesTestID="popularity-tracking-settings-yes"
      />
    </MobileScreenContainer>
  );
}
