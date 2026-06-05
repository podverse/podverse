'use client';

import type { AbstractIntlMessages } from 'next-intl';
import { NextIntlClientProvider } from 'next-intl';
import { Suspense } from 'react';

import { ManagementRouteNavigationLoading } from '../components/LoadingSpinner/ManagementRouteNavigationLoading';

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
      <Suspense fallback={null}>
        <ManagementRouteNavigationLoading />
      </Suspense>
      {children}
    </NextIntlClientProvider>
  );
}
