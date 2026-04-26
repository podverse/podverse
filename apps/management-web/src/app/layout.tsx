// The root styles must be imported first to ensure the correct order of styles
import '../styles/index.scss';

import Providers from '../providers/Providers';
import { getLocale } from 'next-intl/server';
import RuntimeConfigScript from '../components/Head/RuntimeConfigScript';
import FavIcons from '../components/Head/FavIcons';
import Manifest from '../components/Head/Manifest';
import { getConfig } from '../config';
import { getRuntimeConfig, setRuntimeConfig } from '../config/runtime-config-store';
import { fetchManagementWebRuntimeConfigFromSidecar } from '../config/runtime-config.server';

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

  return (
    <html lang={locale}>
      <head>
        <RuntimeConfigScript runtimeConfig={runtimeConfig} />
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <title>{brandName}</title>
        <FavIcons />
        <Manifest />
      </head>
      <body>
        <Providers locale={locale} messages={messages}>
          {children}
        </Providers>
      </body>
    </html>
  );
}
