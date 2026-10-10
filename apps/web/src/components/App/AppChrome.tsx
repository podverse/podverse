'use client';

import { usePathname } from 'next/navigation';

import { AppWrapper, PageWrapper, PageWrapperMain } from '@podverse/ui';

import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { isEmbedPathname } from '../../lib/embed/isEmbedPathname';
import { isPopularityTrackingPromptRequiredForAccount } from '../../lib/popularityTrackingRequired';
import { isTermsAcceptanceRequired } from '../../lib/termsAcceptanceRequired';
import { CookieConsentBanner } from '../Banner/CookieConsentBanner';
import { MembershipExpiredBanner } from '../Banner/MembershipExpiredBanner';
import { LazyLoadedComponents } from '../LazyLoadedComponents/LazyLoadedComponents';
import { PopularityAgreementGate } from '../Legal/PopularityAgreementGate';
import { TermsAgreementGate } from '../Legal/TermsAgreementGate';
import { MediaPlayerController } from '../MediaPlayer/Controller/MediaPlayerController';
import { shouldShowServerEnvironmentDisclaimer } from '../Modal/serverEnvironmentDisclaimer';
import { NavBar } from '../NavBar/NavBar';
import { AnonymousPlaybackRestoreController } from '../Queue/AnonymousPlaybackRestoreController';
import { QueueController } from '../Queue/QueueController';
import { QueueResourcesAbridgedController } from '../Queue/QueueResourcesAbridgedController';
import { SideBar } from '../SideBar/SideBar';
import { WindowWrapper } from '../Window/WindowWrapper';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEmbed = isEmbedPathname(pathname);
  const config = useConfig();
  const { loggedInAccount } = useAccount();
  const { serverEnvironmentDisclaimerAccepted } = useLocalSettings();
  const showDisclaimer =
    shouldShowServerEnvironmentDisclaimer(config.public.server_env) &&
    !serverEnvironmentDisclaimerAccepted;
  const showTerms =
    !showDisclaimer &&
    isTermsAcceptanceRequired(loggedInAccount, config.public.legal.terms.version);
  const showPopularity =
    !showDisclaimer &&
    !showTerms &&
    isPopularityTrackingPromptRequiredForAccount(
      loggedInAccount,
      config.public.legal.popularityTracking.version
    );

  if (isEmbed) {
    return children;
  }

  if (showTerms) {
    return <TermsAgreementGate />;
  }

  if (showPopularity) {
    return <PopularityAgreementGate />;
  }

  return (
    <>
      <WindowWrapper>
        <AppWrapper>
          <SideBar />
          <PageWrapper>
            <NavBar />
            <MembershipExpiredBanner />
            <CookieConsentBanner />
            <PageWrapperMain>{children}</PageWrapperMain>
          </PageWrapper>
        </AppWrapper>
        <LazyLoadedComponents />
      </WindowWrapper>
      <MediaPlayerController />
      <QueueController />
      <AnonymousPlaybackRestoreController />
      <QueueResourcesAbridgedController />
    </>
  );
}
