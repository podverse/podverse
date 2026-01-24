import '../styles/index.scss';
import Providers from '../providers/Providers';
import { getLocale } from 'next-intl/server';
import { config } from '../config';
import FavIcons from '../components/Head/FavIcons';
import Manifest from '../components/Head/Manifest';

export const metadata = {
  title: config.public.brand.name || 'Podverse Management',
  description: 'Administrative management interface for Podverse',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = await getLocale();
  const messages = (await import(`../../i18n/originals/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
