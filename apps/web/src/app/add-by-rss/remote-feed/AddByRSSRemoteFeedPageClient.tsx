'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import type { JSX } from 'react';
import { useEffect } from 'react';
import { FaCirclePlus } from 'react-icons/fa6';

import {
  getAddByRSSDetailRouteSegment,
  getAddByRSSResourceTypeFromMappedFeed,
} from '@podverse/parser-mapping';
import { MainColumnStack, MainHeader, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../../components/Main/MainWrapper';
import { SearchDetail } from '../../../components/SearchDetail/SearchDetail';
import { isParsedStatus, useAddByRSSAddFeedFlow } from '../../../hooks/useAddByRSSAddFeedFlow';
import { getAddByRSSFeedByUrl, upsertAddByRSSFeed } from '../../../utils/addByRSS/storage';

type AddByRSSRemoteFeedPageClientProps = {
  feedUrl: string;
  title: string | null;
};

export function AddByRSSRemoteFeedPageClient({
  feedUrl,
  title,
}: AddByRSSRemoteFeedPageClientProps): JSX.Element {
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const router = useRouter();
  const { addFeed, inputError, isAddingFeed, statusError, statusLabel, statusMessage } =
    useAddByRSSAddFeedFlow();

  useEffect(() => {
    let cancelled = false;

    const redirectIfParsed = async () => {
      const record = await getAddByRSSFeedByUrl(feedUrl);
      if (cancelled || !record || !isParsedStatus(record.status)) {
        return;
      }

      const resourceType =
        record.resourceType ?? getAddByRSSResourceTypeFromMappedFeed(record.mappedFeed);
      if (record.resourceType !== resourceType) {
        await upsertAddByRSSFeed({ ...record, resourceType });
      }
      if (cancelled) {
        return;
      }

      const routeSegment = getAddByRSSDetailRouteSegment(resourceType);
      router.replace(`/add-by-rss/${routeSegment}/${record.idText}`);
    };

    void redirectIfParsed();
    return () => {
      cancelled = true;
    };
  }, [feedUrl, router]);

  return (
    <>
      <MainHeader title={tFeatures('add_by_rss.label')} />
      <MainWrapper>
        <MainSidebarLayout>
          <SideContent />
          <MainColumnStack>
            <SearchDetail
              explanation={tFeatures('add_by_rss.remote_feed_explanation')}
              primaryAction={{
                label: tFeatures('add_by_rss.label'),
                icon: <FaCirclePlus />,
                isLoading: isAddingFeed,
                onClick: () => {
                  void addFeed({
                    rawFeedUrl: feedUrl,
                    username: null,
                    password: null,
                    title,
                  });
                },
              }}
              rssHref={feedUrl}
              statusMessage={statusMessage ?? statusLabel}
              errorMessage={statusError ?? inputError}
              imageUrls={[]}
              imageLightboxUrls={[]}
              imageAlt={tMedia('podcast.podcast_image')}
              title={title ?? feedUrl}
              author={null}
              updatedLabel={null}
              description={title === null ? null : feedUrl}
            />
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
