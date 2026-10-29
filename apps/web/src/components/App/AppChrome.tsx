'use client';

import { usePathname } from 'next/navigation';

import { AppBarTitleProvider, AppWrapper, PageWrapper, PageWrapperMain } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { isEmbedPathname } from '../../lib/embed/isEmbedPathname';
import { isTasteProfileConsentPromptRequiredForAccount } from '../../lib/tasteProfileConsentRequired';
import { isTermsAcceptanceRequired } from '../../lib/termsAcceptanceRequired';
import { SessionEndedNotice } from '../Auth/SessionEndedNotice';
import { SignInPushPrompt } from '../Auth/SignInPushPrompt';
import { BackgroundActivityOverlay } from '../BackgroundActivity/BackgroundActivityOverlay';
import { CookieConsentBanner } from '../Banner/CookieConsentBanner';
import { MembershipExpiredBanner } from '../Banner/MembershipExpiredBanner';
import { LazyLoadedComponents } from '../LazyLoadedComponents/LazyLoadedComponents';
import { TasteProfileAgreementGate } from '../Legal/TasteProfileAgreementGate';
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
  const onAccountAccess = pathname === ROUTES.ACCOUNT_ACCESS;
  const showTasteProfileConsent =
    !showDisclaimer &&
    !showTerms &&
    isTasteProfileConsentPromptRequiredForAccount(
      loggedInAccount,
      config.public.legal.tasteProfileAgreement.version
    );

  if (isEmbed) {
    return children;
  }

  if (showTerms && onAccountAccess) {
    return children;
  }

  if (showTerms) {
    return <TermsAgreementGate />;
  }

  if (showTasteProfileConsent) {
    return <TasteProfileAgreementGate />;
  }

  return (
    <>
      <WindowWrapper>
        <AppBarTitleProvider>
          <AppWrapper>
            <SideBar />
            <PageWrapper>
              <NavBar />
              <MembershipExpiredBanner />
              <CookieConsentBanner />
              <PageWrapperMain>{children}</PageWrapperMain>
            </PageWrapper>
          </AppWrapper>
        </AppBarTitleProvider>
        <LazyLoadedComponents />
        <BackgroundActivityOverlay />
        <SessionEndedNotice />
        <SignInPushPrompt />
      </WindowWrapper>
      <MediaPlayerController />
      <QueueController />
      <AnonymousPlaybackRestoreController />
      <QueueResourcesAbridgedController />
    </>
  );
}
