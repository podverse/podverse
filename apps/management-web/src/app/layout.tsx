// The root styles must be imported first to ensure the correct order of styles
import '../styles/index.scss';

import Providers from '../providers/Providers';
import { getLocale } from 'next-intl/server';
import RuntimeConfigScript from '../components/Head/RuntimeConfigScript';
import FavIcons from '../components/Head/FavIcons';
import Manifest from '../components/Head/Manifest';
import { getConfig } from '../config';
import { fetchManagementWebRuntimeConfigFromSidecar } from '../config/runtime-config.server';
import { setRuntimeConfig } from '../config/runtime-config-store';

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Fetch from sidecar on each request so config is correct if sidecar was not ready at startup.
  // instrumentation.ts also fetches and setRuntimeConfig at process start.
  const runtimeConfig = await fetchManagementWebRuntimeConfigFromSidecar();
  setRuntimeConfig(runtimeConfig);
  const config = getConfig();
  const brandName = config.public.brand.name ?? 'Podverse Management';
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
