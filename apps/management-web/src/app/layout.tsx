// The root styles must be imported first to ensure the correct order of styles
import '../styles/index.scss';

import type { Metadata } from 'next';
import { cookies } from 'next/headers';

import { IntegrationsWebScripts } from '@podverse/integrations-web';
import { FontPreloads } from '@podverse/ui';

import Providers from '../providers/Providers';
import { getLocale } from 'next-intl/server';
import RuntimeConfigScript from '../components/Head/RuntimeConfigScript';
import FavIcons from '../components/Head/FavIcons';
import { getConfig } from '../config';
import { getCustomThemeCssText } from '../config/custom-themes.server';
import { resolveManagementWebRuntimeConfigForRequest } from '../config/resolve-runtime-config.server';
import { toUITheme, UI_THEME_COOKIE } from '../utils/uiTheme';

const managementBrandName = getConfig().public.brand.name ?? 'Management';

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
  },
  title: {
    default: managementBrandName,
    template: `%s | ${managementBrandName}`,
  },
};

async function loadCompiledMessages(locale: string) {
  try {
    return (await import(`../../i18n/compiled/${locale}.json`)).default;
  } catch {
    const base = locale.split('-')[0];
    if (base) {
      try {
        return (await import(`../../i18n/compiled/${base}.json`)).default;
      } catch {
        // do nothing
      }
    }

    return (await import('../../i18n/compiled/en-US.json')).default;
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const runtimeConfig = await resolveManagementWebRuntimeConfigForRequest();
  const customThemeCssText = getCustomThemeCssText(runtimeConfig);
  const locale = await getLocale();
  const messages = await loadCompiledMessages(locale);

  const cookieStore = await cookies();
  const ssrUITheme = toUITheme(cookieStore.get(UI_THEME_COOKIE)?.value);

  return (
    <html lang={locale} data-ui-theme={ssrUITheme}>
      <head>
        <RuntimeConfigScript runtimeConfig={runtimeConfig} />
        {customThemeCssText ? (
          <style id="pv-custom-theme-variables">{customThemeCssText}</style>
        ) : null}
        <IntegrationsWebScripts integrations={runtimeConfig.integrations} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
