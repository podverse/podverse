'use client';

import type { FormEvent } from 'react';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { sleep } from '@podverse/helpers';
import { convertParsedRSSFeedToCompat } from '@podverse/parser-mapping';

import { Button } from '../../components/Button/Button';
import { MainHeader } from '../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { NoResults } from '../../components/NoResults/NoResults';
import { SideContent } from '../../components/SideContent/SideContent';
import { TextInput } from '../../components/Form/TextInput';
import { Image } from '../../components/Image/Image';
import { CallToActionMessage } from '../../components/CallToActionMessage/CallToActionMessage';
import LoadingSpinnerOverlay from '../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { useModals } from '../../contexts/Modals';
import { useAccount } from '../../contexts/Account';
import { IMAGES } from '../../constants/images';
import styles from '../../styles/app/add-by-rss/AddByRSSList.module.scss';
import {
  enqueueAddByRSSParse,
  enqueueAddByRSSParseAll,
  followAddByRSSChannel,
  getAddByRSSParseStatus,
  getFollowedAddByRSSChannels,
} from '../../utils/addByRSS/api';
import { createAddByRSSId, createAddByRSSIdText } from '../../utils/addByRSS/ids';
import {
  bulkUpsertAddByRSSFeeds,
  bulkRemoveAddByRSSFeeds,
  getAddByRSSFeedByUrl,
  getAddByRSSFeedsByResourceType,
  getAllAddByRSSFeeds,
  upsertAddByRSSFeed,
} from '../../utils/addByRSS/storage';
import type {
  AddByRSSFeedRecord,
  AddByRSSParsedFeed,
  AddByRSSResourceType,
} from '../../utils/addByRSS/types';

type AddByRSSListClientProps = {
  resourceType: AddByRSSResourceType;
};

const STATUS_POLL_DELAY_MS = 3000;
const STATUS_POLL_MAX_ATTEMPTS = 30;

const buildDetailRoute = (resourceType: AddByRSSResourceType, idText: string): string =>
  `/add-by-rss/${resourceType}/${idText}`;

const getResourceLabel = (
  resourceType: AddByRSSResourceType,
  tMedia: ReturnType<typeof useTranslations>
) => {
  switch (resourceType) {
    case 'podcasts':
      return tMedia('podcast.podcasts');
    case 'episodes':
      return tMedia('podcast.episodes');
    case 'artists':
      return tMedia('music.artists');
    case 'albums':
      return tMedia('music.albums');
    case 'tracks':
      return tMedia('music.tracks');
    case 'livestreams':
      return tMedia('livestream.livestreams');
    default:
      return resourceType;
  }
};

const getStatusLabel = (
  status: AddByRSSFeedRecord['status'] | undefined,
  tFeatures: ReturnType<typeof useTranslations>
): string => {
  if (!status) {
    return '-';
  }
  switch (status) {
    case 'queued':
      return tFeatures('add_by_rss.status_queued');
    case 'processing':
      return tFeatures('add_by_rss.status_processing');
    case 'parsed':
      return tFeatures('add_by_rss.status_parsed');
    case 'not_modified':
      return tFeatures('add_by_rss.status_not_modified');
    case 'failed':
      return tFeatures('add_by_rss.status_failed');
    default:
      return status;
  }
};

const buildCacheMaps = (feeds: AddByRSSFeedRecord[]) => {
  const feedHashesByUrl: Record<string, string> = {};
  const etagsByUrl: Record<string, string> = {};
  const lastModifiedByUrl: Record<string, string> = {};

  for (const feed of feeds) {
    if (feed.cache?.feedHash) {
      feedHashesByUrl[feed.feedUrl] = feed.cache.feedHash;
    }
    if (feed.cache?.etag) {
      etagsByUrl[feed.feedUrl] = feed.cache.etag;
    }
    if (feed.cache?.lastModified) {
      lastModifiedByUrl[feed.feedUrl] = feed.cache.lastModified;
    }
  }

  return { feedHashesByUrl, etagsByUrl, lastModifiedByUrl };
};

const upsertFeedInState = (
  feeds: AddByRSSFeedRecord[],
  updated: AddByRSSFeedRecord
): AddByRSSFeedRecord[] => {
  const index = feeds.findIndex((feed) => feed.idText === updated.idText);
  if (index === -1) {
    return [...feeds, updated];
  }
  const next = [...feeds];
  next[index] = updated;
  return next;
};

export const AddByRSSListClient: React.FC<AddByRSSListClientProps> = ({ resourceType }) => {
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const { loggedInAccount } = useAccount();
  const { setModalAuthLogin } = useModals();

  const [feeds, setFeeds] = useState<AddByRSSFeedRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isAddingFeed, setIsAddingFeed] = useState(false);
  const [newFeedUrl, setNewFeedUrl] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const headerTitle = useMemo(
    () => `${tFeatures('add_by_rss.label')} · ${getResourceLabel(resourceType, tMedia)}`,
    [resourceType, tFeatures, tMedia]
  );

  const refreshFeeds = useCallback(async () => {
    const nextFeeds = await getAddByRSSFeedsByResourceType(resourceType);
    setFeeds(nextFeeds.sort((a, b) => (a.title || a.feedUrl).localeCompare(b.title || b.feedUrl)));
  }, [resourceType]);

  const syncFeeds = useCallback(async () => {
    if (!loggedInAccount) {
      return;
    }

    const remote = await getFollowedAddByRSSChannels(loggedInAccount.id_text);
    const existing = await getAllAddByRSSFeeds();
    const remoteUrls = new Set(remote.map((channel) => channel.feed_url));
    const toRemove = existing
      .filter((feed) => !remoteUrls.has(feed.feedUrl))
      .map((feed) => feed.idText);
    const existingByUrl = new Map(existing.map((feed) => [feed.feedUrl, feed]));
    const now = new Date().toISOString();

    if (toRemove.length > 0) {
      await bulkRemoveAddByRSSFeeds(toRemove);
    }

    const toUpsert: AddByRSSFeedRecord[] = remote.map((channel) => {
      const existingRecord = existingByUrl.get(channel.feed_url);
      if (existingRecord) {
        return {
          ...existingRecord,
          title: channel.title ?? existingRecord.title,
          imageUrl: channel.image_url ?? existingRecord.imageUrl,
          updatedAt: now,
        };
      }

      const idText = createAddByRSSIdText();
      return {
        id: createAddByRSSId(idText),
        idText,
        resourceType: 'podcasts',
        feedUrl: channel.feed_url,
        title: channel.title ?? channel.feed_url,
        imageUrl: channel.image_url ?? null,
        updatedAt: now,
      };
    });

    if (toUpsert.length > 0) {
      await bulkUpsertAddByRSSFeeds(toUpsert);
    }
  }, [loggedInAccount]);

  const loadFeeds = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage(null);

    if (!loggedInAccount) {
      setFeeds([]);
      setIsLoading(false);
      return;
    }

    try {
      await syncFeeds();
      await refreshFeeds();
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsLoading(false);
    }
  }, [loggedInAccount, refreshFeeds, syncFeeds]);

  const upsertFeed = useCallback(
    async (updated: AddByRSSFeedRecord) => {
      await upsertAddByRSSFeed(updated);
      if (updated.resourceType === resourceType) {
        setFeeds((prev) => upsertFeedInState(prev, updated));
      }
    },
    [resourceType]
  );

  const handleParseStatus = useCallback(
    async (
      feedUrl: string,
      parsedFeed: AddByRSSParsedFeed | undefined,
      status: AddByRSSFeedRecord['status'],
      cache?: AddByRSSFeedRecord['cache']
    ) => {
      const existing = await getAddByRSSFeedByUrl(feedUrl);
      if (!existing) {
        return;
      }

      const nextBase = {
        ...existing,
        status,
        cache: cache ?? existing.cache,
        updatedAt: new Date().toISOString(),
      };

      if (!parsedFeed) {
        await upsertFeed(nextBase);
        return;
      }

      const mappedFeed = convertParsedRSSFeedToCompat(parsedFeed);
      const mappedTitle = mappedFeed.channel.channel.title ?? null;
      const mappedImageUrl = mappedFeed.channel.images?.[0]?.url ?? null;
      const updated = {
        ...nextBase,
        mappedFeed,
        title: mappedTitle ?? nextBase.title,
        imageUrl: mappedImageUrl ?? nextBase.imageUrl,
      };
      await upsertFeed(updated);
    },
    [upsertFeed]
  );

  const pollRequest = useCallback(
    async (requestId: string, feedUrl: string) => {
      for (let attempt = 0; attempt < STATUS_POLL_MAX_ATTEMPTS; attempt += 1) {
        const statusResponse = await getAddByRSSParseStatus(requestId);
        const status = statusResponse.status;

        await handleParseStatus(feedUrl, statusResponse.payload, status, statusResponse.cache);

        if (status === 'parsed' || status === 'not_modified' || status === 'failed') {
          return;
        }

        await sleep(STATUS_POLL_DELAY_MS);
      }
    },
    [handleParseStatus]
  );

  const handleCheckForUpdates = useCallback(async () => {
    if (!loggedInAccount) {
      setModalAuthLogin({ isOpen: true });
      return;
    }

    setIsUpdating(true);
    setErrorMessage(null);

    try {
      const allFeeds = await getAllAddByRSSFeeds();
      const { feedHashesByUrl, etagsByUrl, lastModifiedByUrl } = buildCacheMaps(allFeeds);
      const response = await enqueueAddByRSSParseAll({
        feedHashesByUrl,
        etagsByUrl,
        lastModifiedByUrl,
      });

      for (const { feed_url: feedUrl } of response.request_ids) {
        await handleParseStatus(feedUrl, undefined, 'queued');
      }

      await Promise.all(
        response.request_ids.map(({ request_id, feed_url }) => pollRequest(request_id, feed_url))
      );
    } catch (error) {
      setErrorMessage((error as Error).message);
    } finally {
      setIsUpdating(false);
    }
  }, [handleParseStatus, loggedInAccount, pollRequest, setModalAuthLogin]);

  const handleAddFeed = useCallback(
    async (event?: FormEvent) => {
      event?.preventDefault();
      if (isAddingFeed) {
        return;
      }
      if (!loggedInAccount) {
        setModalAuthLogin({ isOpen: true });
        return;
      }

      const feedUrl = newFeedUrl.trim();
      if (!feedUrl) {
        return;
      }

      setIsAddingFeed(true);
      setErrorMessage(null);

      try {
        try {
          new URL(feedUrl);
        } catch {
          setErrorMessage(tFeatures('add_by_rss.invalid_url'));
          setIsAddingFeed(false);
          return;
        }

        await followAddByRSSChannel({ feedUrl });

        const idText = createAddByRSSIdText();
        const record: AddByRSSFeedRecord = {
          id: createAddByRSSId(idText),
          idText,
          resourceType,
          feedUrl,
          title: feedUrl,
          imageUrl: null,
          status: 'queued',
          updatedAt: new Date().toISOString(),
        };
        await upsertFeed(record);
        setNewFeedUrl('');

        const parseResponse = await enqueueAddByRSSParse({ feedUrl });
        await pollRequest(parseResponse.request_id, feedUrl);
      } catch (error) {
        setErrorMessage((error as Error).message);
      } finally {
        setIsAddingFeed(false);
      }
    },
    [
      isAddingFeed,
      loggedInAccount,
      newFeedUrl,
      pollRequest,
      resourceType,
      setModalAuthLogin,
      upsertFeed,
    ]
  );

  React.useEffect(() => {
    void loadFeeds();
  }, [loadFeeds]);

  return (
    <>
      <MainHeader
        title={headerTitle}
        buttonsNode={
          <Button onClick={handleCheckForUpdates} isLoading={isUpdating} variant="outline">
            {tFeatures('add_by_rss.check_updates')}
          </Button>
        }
      />
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            {!loggedInAccount && (
              <CallToActionMessage
                message={tInstructions('login_for_subscriptions')}
                buttonLabel={tAuthentication('login')}
                onButtonClick={() => setModalAuthLogin({ isOpen: true })}
              />
            )}

            {loggedInAccount && (
              <form onSubmit={handleAddFeed} className={styles.addFeedForm}>
                <TextInput
                  value={newFeedUrl}
                  onChange={(event) => setNewFeedUrl(event.target.value)}
                  placeholder={tFeatures('add_by_rss.feed_url')}
                  aria-label={tFeatures('add_by_rss.feed_url')}
                  className={styles.addFeedInput}
                  infoError={errorMessage ?? undefined}
                  aria-invalid={errorMessage ? true : undefined}
                  disabled={isAddingFeed}
                  button={{
                    label: tFeatures('add_feed.add_feed'),
                    onClick: () => {
                      void handleAddFeed();
                    },
                  }}
                />
              </form>
            )}

            {isLoading ? (
              <LoadingSpinnerOverlay isLoading />
            ) : feeds.length === 0 ? (
              <NoResults message={tFeatures('add_by_rss.no_feeds')} />
            ) : (
              <div className={styles.list}>
                {feeds.map((feed) => (
                  <Link
                    key={feed.idText}
                    href={buildDetailRoute(resourceType, feed.idText)}
                    className={styles.listItem}
                  >
                    <Image
                      src={feed.imageUrl ?? feed.mappedFeed?.channel.images?.[0]?.url ?? undefined}
                      alt={feed.title || tMedia('podcast.podcast_image')}
                      width={IMAGES.LIST.PODCASTS.SIZE}
                      height={IMAGES.LIST.PODCASTS.SIZE}
                      className={styles.image}
                    />
                    <div className={styles.content}>
                      <h3 className={styles.title}>{feed.title || feed.feedUrl}</h3>
                      <div className={styles.meta}>
                        <span className={styles.statusLabel}>
                          {tFeatures('add_by_rss.status')}:
                        </span>
                        <span className={styles.statusValue}>
                          {getStatusLabel(feed.status, tFeatures)}
                        </span>
                      </div>
                      <span className={styles.feedUrl}>{feed.feedUrl}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
};
