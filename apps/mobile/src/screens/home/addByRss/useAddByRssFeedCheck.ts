import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useAuth } from '../../../auth/AuthProvider';
import { addByRssCredentialStore, addByRssRepository } from '../../../data';
import { syncEventLogRepository } from '../../../data/repositories';
import { useAddByRssParsePath } from '../../../hooks/useAddByRssParsePath';
import { buildAddByRssParseFailureLog } from '../../../lib/addByRss/addByRssErrorLog';
import { credentialNoticeKeyForParse } from '../../../lib/addByRss/credentials';
import { homeFeedRefresh } from '../../../lib/home/homeFeedRefresh';
import { handleRateLimitMessage } from '../../../lib/rateLimit/handleRateLimitMessage';
import { useMembershipGate } from '../../../membership/MembershipGateProvider';
import { useAccessTier } from '../../../membership/useAccessTier';

export type AddByRssFeedCheckMode = 'interactive' | 'pull';

export type AddByRssFeedCheck = {
  checkFeed: (mode: AddByRssFeedCheckMode) => Promise<void>;
  isChecking: boolean;
  /**
   * Catalog key, or an already-translated rate-limit sentence (those contain spaces).
   * Translate keys; show a sentence as it is.
   */
  noticeKey: string | null;
};

/**
 * Check one add-by-RSS feed for updates.
 *
 * Credentials are read from the device store and sent only to the feed host (signed out, the
 * phone parses) or on the parse request (signed in, the server parses). Signed in, an interactive
 * check asks for membership first, and a pull while refresh is not allowed re-reads the device
 * copy without asking the server, the same way a lapsed membership keeps feeds readable and stops
 * refreshing them. Signed out, nothing is gated.
 */
export function useAddByRssFeedCheck({
  feedUrl,
  onChecked,
}: {
  feedUrl: string | null;
  onChecked: () => Promise<void>;
}): AddByRssFeedCheck {
  const { t } = useTranslation();
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const { handleGateError, openGate } = useMembershipGate();
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const parsePath = useAddByRssParsePath();
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const isBusyRef = useRef(false);
  const isMountedRef = useRef(true);
  const feedUrlRef = useRef(feedUrl);
  feedUrlRef.current = feedUrl;

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setNoticeKey(null);
  }, [feedUrl]);

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const checkFeed = useCallback(
    async (mode: AddByRssFeedCheckMode) => {
      if (isBusyRef.current || feedUrl === null) {
        return;
      }

      const access = evaluateFeature('add_by_rss_refresh');
      if (parsePath === 'server' && isTierKnown && !access.allowed) {
        if (mode === 'pull') {
          await onChecked();
        } else {
          openGate(access.reason);
        }
        return;
      }

      isBusyRef.current = true;
      if (isMountedRef.current) {
        setIsChecking(true);
        if (mode === 'interactive') {
          setNoticeKey(null);
        }
      }

      try {
        const credentials = await addByRssCredentialStore.getForCurrentAccount(feedUrl);
        const { requestId, result } = await addByRssRepository.parseNowByPath(
          authContext,
          feedUrl,
          credentials,
          { path: parsePath }
        );
        homeFeedRefresh.notify();

        const failureLog = buildAddByRssParseFailureLog({
          feedUrl,
          jobKind: parsePath === 'device' ? 'add-by-rss-device-parse' : 'add-by-rss-parse',
          occurredAt: Date.now(),
          requestId,
          result,
        });
        if (failureLog !== null) {
          void syncEventLogRepository.append(failureLog);
        }

        if (!isMountedRef.current || feedUrlRef.current !== feedUrl) {
          return;
        }
        const failureNotice =
          credentialNoticeKeyForParse(result) ?? (failureLog === null ? null : 'errors.generic');
        setNoticeKey(
          failureNotice ?? (mode === 'pull' ? null : 'features.add_by_rss.status_parsed')
        );
      } catch (error) {
        if (handleGateError(error)) {
          return;
        }
        if (!isMountedRef.current || feedUrlRef.current !== feedUrl) {
          return;
        }
        setNoticeKey(handleRateLimitMessage(error, t) ?? 'errors.generic');
      } finally {
        isBusyRef.current = false;
        if (isMountedRef.current) {
          setIsChecking(false);
          if (feedUrlRef.current === feedUrl) {
            await onChecked();
          }
        }
      }
    },
    [
      authContext,
      evaluateFeature,
      feedUrl,
      handleGateError,
      isTierKnown,
      onChecked,
      openGate,
      parsePath,
      t,
    ]
  );

  return { checkFeed, isChecking, noticeKey };
}
