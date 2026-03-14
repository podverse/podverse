'use client';

import { NextIntlClientProvider } from 'next-intl';

import type { DTOAccount, DTOCategory, QueueResourcesAbridgedIndex } from '@podverse/helpers';

import type { WebConfig } from '../config';
import { AccountProvider } from '../contexts/Account';
import { AddByRSSListContextProvider } from '../contexts/AddByRSSListContext';
import { AutoQueueProvider } from '../contexts/AutoQueue';
import { CategoriesProvider } from '../contexts/Categories';
import { ConfigProvider } from '../contexts/Config';
import { LocalSettingsProvider } from '../contexts/LocalSettings';
import { MediaPlayerProvider } from '../contexts/MediaPlayer';
import { MediaPlayerCurrentTimeProvider } from '../contexts/MediaPlayerCurrentTime';
import { MediaPlayerVideoProvider } from '../contexts/MediaPlayerVideo';
import { ModalsProvider } from '../contexts/Modals';
import { NavigationProvider } from '../contexts/Navigation';
import { NotificationsProvider } from '../contexts/Notifications';
import { PlaylistsFavoritesProvider } from '../contexts/PlaylistsFavorites';
import { QueuesProvider } from '../contexts/Queue';
import { QueueResourcesAbridgedIndexProvider } from '../contexts/QueueResourcesAbridgedIndex';
import type { LocalSettingsState } from '../utils/localSettings/localSettings';

export default function Providers({
  children,
  config,
  locale,
  ssrLocalSettings,
  ssrLoggedInAccount,
  ssrQueueResourcesAbridgedIndex,
  messages,
  categories,
}: {
  children: React.ReactNode;
  config: WebConfig;
  locale: string;
  ssrLocalSettings: LocalSettingsState;
  ssrLoggedInAccount: DTOAccount | null;
  ssrQueueResourcesAbridgedIndex: QueueResourcesAbridgedIndex | null;
  messages: Record<string, Record<string, string | Record<string, unknown>>>;
  categories: DTOCategory[];
}) {
  return (
    <ConfigProvider config={config}>
      <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/Chicago">
        <NavigationProvider>
          <LocalSettingsProvider ssrLocalSettings={ssrLocalSettings}>
            <AccountProvider ssrLoggedInAccount={ssrLoggedInAccount}>
              <NotificationsProvider>
                <QueuesProvider>
                  <QueueResourcesAbridgedIndexProvider
                    ssrQueueResourcesAbridgedIndex={ssrQueueResourcesAbridgedIndex}
                  >
                    <PlaylistsFavoritesProvider>
                      <MediaPlayerCurrentTimeProvider>
                        <MediaPlayerProvider>
                          <MediaPlayerVideoProvider>
                            <AddByRSSListContextProvider>
                              <AutoQueueProvider ssrLocalSettings={ssrLocalSettings}>
                                <ModalsProvider>
                                  <CategoriesProvider ssrCategories={categories}>
                                    {children}
                                  </CategoriesProvider>
                                </ModalsProvider>
                              </AutoQueueProvider>
                            </AddByRSSListContextProvider>
                          </MediaPlayerVideoProvider>
                        </MediaPlayerProvider>
                      </MediaPlayerCurrentTimeProvider>
                    </PlaylistsFavoritesProvider>
                  </QueueResourcesAbridgedIndexProvider>
                </QueuesProvider>
              </NotificationsProvider>
            </AccountProvider>
          </LocalSettingsProvider>
        </NavigationProvider>
      </NextIntlClientProvider>
    </ConfigProvider>
  );
}
