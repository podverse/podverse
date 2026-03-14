'use client';

import type { PodcastByIdFeed } from '@podverse/helpers';

import { MainInnerContentWrapper } from '../../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../../components/Main/MainWrapper';
import { PodcastIndexFeedInfo } from '../../../../components/PodcastIndex/PodcastIndexFeedInfo';
import { SideContent } from '../../../../components/SideContent/SideContent';
import { PodcastIndexFeedHeader } from './PodcastIndexFeedHeader';

type PodcastIndexFeedClientProps = {
  ssrFeed: PodcastByIdFeed;
};

export function PodcastIndexFeedClient({ ssrFeed }: PodcastIndexFeedClientProps) {
  return (
    <MainWrapper>
      <PodcastIndexFeedHeader />
      <MainInnerWrapper>
        <SideContent />
        <MainInnerContentWrapper>
          <PodcastIndexFeedInfo podcastIndexFeed={ssrFeed} />
        </MainInnerContentWrapper>
      </MainInnerWrapper>
    </MainWrapper>
  );
}
