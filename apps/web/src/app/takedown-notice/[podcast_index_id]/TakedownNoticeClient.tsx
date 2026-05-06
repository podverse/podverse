'use client';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo } from 'react';

import type { DTOFeed } from '@podverse/helpers';

import { MainHeader } from '../../../components/Main/MainHeader';
import { MainInnerContentWrapper } from '../../../components/Main/MainInnerContentWrapper';
import { MainInnerWrapper } from '../../../components/Main/MainInnerWrapper';
import { MainWrapper } from '../../../components/Main/MainWrapper';
import { SideContent } from '../../../components/SideContent/SideContent';
import {
  resolveLegalNoticeTranslationKeys,
  shouldRedirectFromTakedownNoticePage,
} from '../../../lib/feed/takedownNoticeFromFeed';

import styles from './TakedownNoticeClient.module.scss';

type TakedownNoticeClientProps = {
  ssrFeed: DTOFeed | null;
};

export function TakedownNoticeClient({ ssrFeed }: TakedownNoticeClientProps) {
  const tLegal = useTranslations('legal');
  const router = useRouter();

  const shouldRedirect = useMemo(() => shouldRedirectFromTakedownNoticePage(ssrFeed), [ssrFeed]);

  const { policyKey, explanationKey } = useMemo(() => {
    if (!ssrFeed) {
      return {
        policyKey: 'takedown_policy' as const,
        explanationKey: 'takedown_policy_explanation' as const,
      };
    }
    return resolveLegalNoticeTranslationKeys(ssrFeed);
  }, [ssrFeed]);

  useEffect(() => {
    if (!ssrFeed || shouldRedirect) {
      if (ssrFeed?.podcast_index_id) {
        router.replace(`/podcast-index/feed/${ssrFeed.podcast_index_id}`);
      } else {
        router.replace('/');
      }
    }
  }, [ssrFeed, shouldRedirect, router]);

  if (!ssrFeed || shouldRedirect) {
    return null;
  }

  return (
    <>
      <MainHeader title={tLegal('takedown_notice')} />
      <MainWrapper>
        <MainInnerWrapper>
          <SideContent />
          <MainInnerContentWrapper>
            <h3 className={styles.heading}>{tLegal(policyKey)}</h3>
            <p>{tLegal(explanationKey)}</p>
          </MainInnerContentWrapper>
        </MainInnerWrapper>
      </MainWrapper>
    </>
  );
}
