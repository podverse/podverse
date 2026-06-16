import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import type { QueueResourcesAbridgedIndex } from '@podverse/helpers';
import { generateQueueResourceAbridgedIndex } from '@podverse/helpers';
import { AppChrome } from '../components/App/AppChrome';
import { AuthSessionChecker } from '../components/Auth/AuthSessionChecker';
import { FavIcons } from '../components/Head/FavIcons';
import { RouteAwareFontPreloads } from '../components/Head/RouteAwareFontPreloads';
import { RuntimeConfigScript } from '../components/Head/RuntimeConfigScript';
import { getConfig, getWebOrigin } from '../config';
import { getCustomThemeCssText } from '../config/custom-themes.server';
import { resolveWebRuntimeConfigForRequest } from '../config/resolve-runtime-config.server';
import { ASSETS } from '../constants/assets';
import { getSSRApiRequestService } from '../factories/apiRequestService';
import { useLocaleDetect } from '../hooks/useLocaleDetect';
import { setSSRAccountForLocale } from '../i18n/request';
import Providers from '../providers/Providers';
import { getSSRJwtFromCookies, getSSRLoggedInAccount } from '../utils/auth/ssrAuth';
import { getParsedLocalSettings } from '../utils/localSettings/localSettings';
import { toUITheme } from '../utils/localSettings/uiTheme';

import '../styles/index.scss';

const staticConfig = getConfig();
const brandName = staticConfig.public.brand.name;
const defaultOpenGraphImage = new URL(
  staticConfig.public.brand.logoLight || ASSETS.IMAGES.BRANDING.BRAND.LOGO,
  getWebOrigin()
).toString();

export const metadata: Metadata = {
  metadataBase: new URL(getWebOrigin()),
  title: {
    default: brandName,
    template: `%s | ${brandName}`,
  },
  openGraph: {
    siteName: brandName,
    images: [{ url: defaultOpenGraphImage }],
  },
};

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
        <RouteAwareFontPreloads />
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
            <AppChrome>{children}</AppChrome>
          </Providers>
        )}
      </body>
    </html>
  );
}
