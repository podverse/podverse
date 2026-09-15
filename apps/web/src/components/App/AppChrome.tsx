'use client';

import { usePathname } from 'next/navigation';

import { AppWrapper, PageWrapper, PageWrapperMain } from '@podverse/ui';

import { ROUTES } from '../../constants/routes';
import { isEmbedPathname } from '../../lib/embed/isEmbedPathname';
import { CookieConsentBanner } from '../Banner/CookieConsentBanner';
import { MembershipExpiredBanner } from '../Banner/MembershipExpiredBanner';
import { LazyLoadedComponents } from '../LazyLoadedComponents/LazyLoadedComponents';
import { MediaPlayerController } from '../MediaPlayer/Controller/MediaPlayerController';
import { NavBar } from '../NavBar/NavBar';
import { PopularityTrackingGateRedirect } from '../PopularityTracking/PopularityTrackingGateRedirect';
import { AnonymousPlaybackRestoreController } from '../Queue/AnonymousPlaybackRestoreController';
import { QueueController } from '../Queue/QueueController';
import { QueueResourcesAbridgedController } from '../Queue/QueueResourcesAbridgedController';
import { SideBar } from '../SideBar/SideBar';
import { WindowWrapper } from '../Window/WindowWrapper';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEmbed = isEmbedPathname(pathname);
  const isPopularityGate = pathname === ROUTES.POPULARITY_TRACKING;

  if (isEmbed || isPopularityGate) {
    return (
      <>
        <PopularityTrackingGateRedirect />
        {children}
      </>
    );
  }

  return (
    <>
      <PopularityTrackingGateRedirect />
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
