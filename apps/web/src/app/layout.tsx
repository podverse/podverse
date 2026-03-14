import { cookies } from 'next/headers';

import type { QueueResourcesAbridgedIndex } from '@podverse/helpers';
import { generateQueueResourceAbridgedIndex } from '@podverse/helpers';

import { AppWrapper } from '../components/App/AppWrapper';
import AuthSessionChecker from '../components/Auth/AuthSessionChecker';
import FavIcons from '../components/Head/FavIcons';
import FontPreloads from '../components/Head/FontPreloads';
import Manifest from '../components/Head/Manifest';
import RuntimeConfigScript from '../components/Head/RuntimeConfigScript';
import { LazyLoadedComponents } from '../components/LazyLoadedComponents/LazyLoadedComponents';
import { MediaPlayerController } from '../components/MediaPlayer/Controller/MediaPlayerController';
import NavBar from '../components/NavBar/NavBar';
import PageWrapper from '../components/PageWrapper/PageWrapper';
import { QueueController } from '../components/Queue/QueueController';
import { QueueResourcesAbridgedController } from '../components/Queue/QueueResourcesAbridgedController';
import { SideBar } from '../components/SideBar/SideBar';
import WindowWrapper from '../components/Window/WindowWrapper';
import { getConfig } from '../config';
import { getRuntimeConfig } from '../config/runtime-config-store';
import { getSSRApiRequestService } from '../factories/apiRequestService';
import { useLocaleDetect } from '../hooks/useLocaleDetect';
import { setSSRAccountForLocale } from '../i18n/request';
import Providers from '../providers/Providers';
import { getSSRJwtFromCookies, getSSRLoggedInAccount } from '../utils/auth/ssrAuth';
import { getParsedLocalSettings } from '../utils/localSettings/localSettings';
import { toUITheme } from '../utils/localSettings/uiTheme';

import '../styles/index.scss';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Runtime config is initialized in instrumentation.ts at server startup
  const runtimeConfig = getRuntimeConfig();
  const config = getConfig();
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
        <title>{config.public.brand.name}</title>
        <FontPreloads />
        <FavIcons />
        <Manifest />
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
                  {children}
                </PageWrapper>
              </AppWrapper>
              <LazyLoadedComponents />
            </WindowWrapper>
            <MediaPlayerController />
            <QueueController />
            <QueueResourcesAbridgedController />
          </Providers>
        )}
      </body>
    </html>
  );
}
