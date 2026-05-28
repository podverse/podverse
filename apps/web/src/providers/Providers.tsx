'use client';

import { NextIntlClientProvider } from 'next-intl';

import type { DTOAccount, DTOCategory, QueueResourcesAbridgedIndex } from '@podverse/helpers';
import { ImageRuntimeProvider } from '@podverse/ui';

import type { WebConfig } from '../config';
import { IMAGES } from '../constants/images';
import { PROXY } from '../constants/proxy';
import { AccountProvider } from '../contexts/Account';
import { AddByRSSListContextProvider } from '../contexts/AddByRSSListContext';
import { AutoQueueProvider } from '../contexts/AutoQueue';
import { CategoriesProvider } from '../contexts/Categories';
import { ConfigProvider } from '../contexts/Config';
import { LocalSettingsProvider } from '../contexts/LocalSettings';
import { MediaPlayerProvider } from '../contexts/MediaPlayer';
import { MediaPlayerControlsProvider } from '../contexts/MediaPlayerControls';
import { MediaPlayerCurrentTimeProvider } from '../contexts/MediaPlayerCurrentTime';
import { MediaPlayerVideoProvider } from '../contexts/MediaPlayerVideo';
import { ModalsProvider } from '../contexts/Modals';
import { NavigationProvider } from '../contexts/Navigation';
import { NotificationsProvider } from '../contexts/Notifications';
import { PlaylistsLikesProvider } from '../contexts/PlaylistsFavorites';
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
      <ImageRuntimeProvider
        imageProxyEnabled={config.public.imageProxy.enabled}
        listGridSlotSize={IMAGES.LIST.GRID.SIZE}
        nextImageOptimizationEnabled={config.public.nextImageOptimization.enabled}
        placeholderSrc={IMAGES.SRC.PLACEHOLDER}
        proxyPathPrefix={PROXY.PATH}
      >
        <NextIntlClientProvider locale={locale} messages={messages} timeZone="America/Chicago">
          <NavigationProvider>
            <LocalSettingsProvider ssrLocalSettings={ssrLocalSettings}>
              <AccountProvider ssrLoggedInAccount={ssrLoggedInAccount}>
                <NotificationsProvider>
                  <QueuesProvider>
                    <QueueResourcesAbridgedIndexProvider
                      ssrQueueResourcesAbridgedIndex={ssrQueueResourcesAbridgedIndex}
                    >
                      <PlaylistsLikesProvider>
                        <MediaPlayerCurrentTimeProvider>
                          <MediaPlayerProvider>
                            <MediaPlayerVideoProvider>
                              <MediaPlayerControlsProvider>
                                <AddByRSSListContextProvider>
                                  <AutoQueueProvider ssrLocalSettings={ssrLocalSettings}>
                                    <ModalsProvider>
                                      <CategoriesProvider ssrCategories={categories}>
                                        {children}
                                      </CategoriesProvider>
                                    </ModalsProvider>
                                  </AutoQueueProvider>
                                </AddByRSSListContextProvider>
                              </MediaPlayerControlsProvider>
                            </MediaPlayerVideoProvider>
                          </MediaPlayerProvider>
                        </MediaPlayerCurrentTimeProvider>
                      </PlaylistsLikesProvider>
                    </QueueResourcesAbridgedIndexProvider>
                  </QueuesProvider>
                </NotificationsProvider>
              </AccountProvider>
            </LocalSettingsProvider>
          </NavigationProvider>
        </NextIntlClientProvider>
      </ImageRuntimeProvider>
    </ConfigProvider>
  );
}
