import { cookies } from 'next/headers';

import type { QueueResourcesAbridgedIndex } from '@podverse/helpers';
import { generateQueueResourceAbridgedIndex } from '@podverse/helpers';
import { AppWrapper, FontPreloads, PageWrapper } from '@podverse/ui';

import { AuthSessionChecker } from '../components/Auth/AuthSessionChecker';
import { CookieConsentBanner } from '../components/Banner/CookieConsentBanner';
import { MembershipExpiredBanner } from '../components/Banner/MembershipExpiredBanner';
import { FavIcons } from '../components/Head/FavIcons';
import { RuntimeConfigScript } from '../components/Head/RuntimeConfigScript';
import { LazyLoadedComponents } from '../components/LazyLoadedComponents/LazyLoadedComponents';
import { MediaPlayerController } from '../components/MediaPlayer/Controller/MediaPlayerController';
import { NavBar } from '../components/NavBar/NavBar';
import { AnonymousPlaybackRestoreController } from '../components/Queue/AnonymousPlaybackRestoreController';
import { QueueController } from '../components/Queue/QueueController';
import { QueueResourcesAbridgedController } from '../components/Queue/QueueResourcesAbridgedController';
import { SideBar } from '../components/SideBar/SideBar';
import { WindowWrapper } from '../components/Window/WindowWrapper';
import { getConfig } from '../config';
import { getCustomThemeCssText } from '../config/custom-themes.server';
import { resolveWebRuntimeConfigForRequest } from '../config/resolve-runtime-config.server';
import { getSSRApiRequestService } from '../factories/apiRequestService';
import { useLocaleDetect } from '../hooks/useLocaleDetect';
import { setSSRAccountForLocale } from '../i18n/request';
import Providers from '../providers/Providers';
import { getSSRJwtFromCookies, getSSRLoggedInAccount } from '../utils/auth/ssrAuth';
import { getParsedLocalSettings } from '../utils/localSettings/localSettings';
import { toUITheme } from '../utils/localSettings/uiTheme';

import '../styles/index.scss';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const runtimeConfig = await resolveWebRuntimeConfigForRequest();
  const config = getConfig();
  const customThemeCssText = getCustomThemeCssText(runtimeConfig);
  const cookieStore = await cookies();
  const ssrLocalSettings = getParsedLocalSettings(cookieStore);
  const ssrUITheme = toUITheme(ssrLocalSettings.uit);

  const jwt = await getSSRJwtFromCookies();
  const ssrLoggedInAccount = await getSSRLoggedInAccount();
  const ssrShouldLogout = !!(jwt && !ssrLoggedInAccount);

  setSSRAccountForLocale(ssrLoggedInAccount);

  // Detect locale based on account settings, cookie, or browser preference
  const locale = await useLocaleDetect(ssrLoggedInAccount);

  let ssrQueueResourcesAbridgedIndex: QueueResourcesAbridgedIndex | null = null;

  const ssrApiRequestService = getSSRApiRequestService(jwt);

  if (jwt) {
    try {
      const ssrQueueResourcesAbridgedIndexResponseData =
        await ssrApiRequestService.reqQueueResourcesGetAllByAccountAbridged();
      ssrQueueResourcesAbridgedIndex = generateQueueResourceAbridgedIndex(
        ssrQueueResourcesAbridgedIndexResponseData
      );
    } catch {
      // do nothing
    }
  }

  const categoriesResponse = await ssrApiRequestService.reqCategoryGetAll();
  const categories = categoriesResponse.data;

  const messages = (await import(`../../i18n/originals/${locale}.json`)).default;

  return (
    <html lang={locale} data-ui-theme={ssrUITheme}>
      <head>
        <RuntimeConfigScript runtimeConfig={runtimeConfig} />
        {customThemeCssText ? (
          <style id="pv-custom-theme-variables">{customThemeCssText}</style>
        ) : null}
        <title>{config.public.brand.name}</title>
        <FontPreloads />
        <FavIcons />
      </head>
      <body>
        {ssrShouldLogout && <AuthSessionChecker ssrShouldLogout={ssrShouldLogout} />}
        {!ssrShouldLogout && (
          <Providers
            config={config}
            locale={locale}
            ssrLoggedInAccount={ssrLoggedInAccount}
            ssrLocalSettings={ssrLocalSettings}
            ssrQueueResourcesAbridgedIndex={ssrQueueResourcesAbridgedIndex}
            messages={messages}
            categories={categories}
          >
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
          </Providers>
        )}
      </body>
    </html>
  );
}
