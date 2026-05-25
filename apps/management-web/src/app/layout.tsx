// The root styles must be imported first to ensure the correct order of styles
import '../styles/index.scss';

import { cookies } from 'next/headers';

import { IntegrationsWebScripts } from '@podverse/integrations-web';
import { FontPreloads } from '@podverse/ui';

import Providers from '../providers/Providers';
import { getLocale } from 'next-intl/server';
import RuntimeConfigScript from '../components/Head/RuntimeConfigScript';
import FavIcons from '../components/Head/FavIcons';
import { getConfig } from '../config';
import { getRuntimeConfig, setRuntimeConfig } from '../config/runtime-config-store';
import { fetchManagementWebRuntimeConfigFromSidecar } from '../config/runtime-config.server';
import { toUITheme, UI_THEME_COOKIE } from '../utils/uiTheme';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  let runtimeConfig = getRuntimeConfig();
  if (process.env.RUNTIME_CONFIG_URL) {
    try {
      runtimeConfig = await fetchManagementWebRuntimeConfigFromSidecar();
      setRuntimeConfig(runtimeConfig);
    } catch {
      // Sidecar may be temporarily unavailable at startup; use safe fallback.
      runtimeConfig = getRuntimeConfig();
    }
  }
  const config = getConfig();
  const brandName = config.public.brand.name ?? 'Management';
  const locale = await getLocale();
  const messages = (await import(`../../i18n/originals/${locale}.json`)).default;

  const cookieStore = await cookies();
  const ssrUITheme = toUITheme(cookieStore.get(UI_THEME_COOKIE)?.value);

  return (
    <html lang={locale} data-ui-theme={ssrUITheme}>
      <head>
        <RuntimeConfigScript runtimeConfig={runtimeConfig} />
        <IntegrationsWebScripts integrations={runtimeConfig.integrations} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{brandName}</title>
        <FontPreloads />
        <FavIcons />
      </head>
      <body>
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
