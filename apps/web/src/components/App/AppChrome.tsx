'use client';

import { usePathname } from 'next/navigation';

import { AppWrapper, PageWrapper } from '@podverse/ui';

import { isEmbedPathname } from '../../lib/embed/isEmbedPathname';
import { CookieConsentBanner } from '../Banner/CookieConsentBanner';
import { MembershipExpiredBanner } from '../Banner/MembershipExpiredBanner';
import { LazyLoadedComponents } from '../LazyLoadedComponents/LazyLoadedComponents';
import { MediaPlayerController } from '../MediaPlayer/Controller/MediaPlayerController';
import { NavBar } from '../NavBar/NavBar';
import { AnonymousPlaybackRestoreController } from '../Queue/AnonymousPlaybackRestoreController';
import { QueueController } from '../Queue/QueueController';
import { QueueResourcesAbridgedController } from '../Queue/QueueResourcesAbridgedController';
import { SideBar } from '../SideBar/SideBar';
import { WindowWrapper } from '../Window/WindowWrapper';

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isEmbed = isEmbedPathname(pathname);

  if (isEmbed) {
    return <>{children}</>;
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
            {children}
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
