'use client';

import { useTranslations } from 'next-intl';
import { useCallback, useRef } from 'react';

import { showToast } from '../components/Toast/Toast';
import {
  addByRSSProtectedMediaMessageKey,
  classifyAddByRSSProtectedMediaFailure,
  findAddByRSSFeedForItem,
  logAddByRSSProtectedMediaFailure,
} from '../utils/addByRSS/protectedMedia';

export type AddByRSSMediaFailureParams = {
  channelIdText?: string | null;
  itemIdText?: string | null;
  mediaUrl: string | null | undefined;
  mediaErrorCode?: number | null;
};

/**
 * Explains an add-by-RSS playback failure when the feed is password-protected. Failures on
 * other feeds are left alone. A given item and URL are explained once, since a media element
 * can report the same failed load more than once.
 */
export function useAddByRSSMediaFailureNotice(): (params: AddByRSSMediaFailureParams) => void {
  const tFeatures = useTranslations('features');
  const lastNoticeKeyRef = useRef<string | null>(null);

  return useCallback(
    (params: AddByRSSMediaFailureParams) => {
      const noticeKey = `${params.itemIdText ?? ''}|${params.mediaUrl ?? ''}`;
      if (lastNoticeKeyRef.current === noticeKey) {
        return;
      }

      void (async () => {
        try {
          const feed = await findAddByRSSFeedForItem(params);
          const failure = classifyAddByRSSProtectedMediaFailure(feed, params.mediaUrl);
          if (!feed || !failure || lastNoticeKeyRef.current === noticeKey) {
            return;
          }
          lastNoticeKeyRef.current = noticeKey;
          logAddByRSSProtectedMediaFailure({
            surface: 'playback',
            failure,
            feed,
            mediaUrl: params.mediaUrl,
            mediaErrorCode: params.mediaErrorCode,
          });
          showToast(tFeatures(addByRSSProtectedMediaMessageKey(failure)), 'error');
        } catch (error) {
          console.error(error);
        }
      })();
    },
    [tFeatures]
  );
}
