'use client';

import { NextIntlClientProvider, AbstractIntlMessages } from 'next-intl';

export default function Providers({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: string;
  messages: AbstractIntlMessages;
}) {
  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/Chicago">
      {children}
    </NextIntlClientProvider>
  );
}
