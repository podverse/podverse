'use client';

import { useTranslations } from 'next-intl';

import type { FeedPolicyPrimaryBlockReasonForUi, PodcastByIdFeed } from '@podverse/helpers';
import { MainColumnStack, MainSidebarLayout, SideContent } from '@podverse/ui';

import { MainWrapper } from '../../../../components/Main/MainWrapper';
import { PodcastIndexFeedInfo } from '../../../../components/PodcastIndex/PodcastIndexFeedInfo';
import { getContactEmail } from '../../../../constants/contact';
import { PodcastIndexFeedHeader } from './PodcastIndexFeedHeader';

type PodcastIndexFeedClientProps = {
  ssrFeed: PodcastByIdFeed;
  blockedReasonForUi: FeedPolicyPrimaryBlockReasonForUi | null;
};

function blockedReasonMessageKey(reason: FeedPolicyPrimaryBlockReasonForUi): string {
  switch (reason) {
    case 'spam_detected':
      return 'blocked_reason_spam_detected';
    case 'oversized_detected':
      return 'blocked_reason_oversized_detected';
    case 'takedown_active':
      return 'blocked_reason_takedown_active';
    case 'manual_block':
      return 'blocked_reason_manual_block';
    case 'unknown':
      return 'blocked_reason_unknown';
    default: {
      const _exhaustive: never = reason;
      return _exhaustive;
    }
  }
}

export function PodcastIndexFeedClient({
  ssrFeed,
  blockedReasonForUi,
}: PodcastIndexFeedClientProps) {
  const t = useTranslations('features.add_feed');
  const contactEmail = getContactEmail();
  const showBlockedBanner = blockedReasonForUi !== null;

  return (
    <MainWrapper>
      <PodcastIndexFeedHeader />
      <MainSidebarLayout>
        <SideContent />
        <MainColumnStack>
          {showBlockedBanner ? (
            <p>
              {t('blocked_feed_banner', {
                reason: t(blockedReasonMessageKey(blockedReasonForUi)),
              })}{' '}
              <a href={`mailto:${contactEmail}`}>{contactEmail}</a>.
            </p>
          ) : null}
          <PodcastIndexFeedInfo podcastIndexFeed={ssrFeed} />
        </MainColumnStack>
      </MainSidebarLayout>
    </MainWrapper>
  );
}
