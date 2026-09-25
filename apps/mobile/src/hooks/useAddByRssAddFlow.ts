import { useCallback, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { resolveAddByRSSFeedUrlCredentials } from '@podverse/helpers-validation/client';

import { requestWithMobileAuthRefresh } from '../auth';
import { useAuth } from '../auth/AuthProvider';
import { addByRssCredentialStore, addByRssRepository } from '../data';
import { syncEventLogRepository } from '../data/repositories';
import {
  buildAddByRssAddErrorLog,
  buildAddByRssParseFailureLog,
} from '../lib/addByRss/addByRssErrorLog';
import type { AddByRssCredentials } from '../lib/addByRss/credentials';
import {
  credentialNoticeKeyForParse,
  splitAddByRssPastedUrl,
  toAddByRssCredentials,
} from '../lib/addByRss/credentials';
import { isValidAddByRssFeedUrl } from '../lib/addByRss/domain';
import { homeFeedRefresh } from '../lib/home/homeFeedRefresh';
import { useMembershipGate } from '../membership/MembershipGateProvider';
import { useAccessTier } from '../membership/useAccessTier';
import { ADD_BY_RSS_ADD_LOG_KIND } from '../sync/syncJobKinds';

type UseAddByRssAddFlowOptions = {
  inputValue: string;
  onAfterAdd: () => Promise<void>;
  onNotice: (messageKey: string | null) => void;
  setInputValue: (value: string) => void;
};

/**
 * Resolves the typed username and password. Both empty means the feed is public; one without the
 * other is an input error rather than a silent public add.
 */
const resolveTypedCredentials = (
  username: string,
  password: string
): { credentials: AddByRssCredentials | null; errorKey: string | null } => {
  if (username.trim() === '' && password === '') {
    return { credentials: null, errorKey: null };
  }
  const credentials = toAddByRssCredentials(username, password);
  return credentials === null
    ? { credentials: null, errorKey: 'features.add_by_rss.basic_auth_required_both' }
    : { credentials, errorKey: null };
};

export function useAddByRssAddFlow({
  inputValue,
  onAfterAdd,
  onNotice,
  setInputValue,
}: UseAddByRssAddFlowOptions) {
  const { accessToken, account, clearSession, refreshToken, setTokens } = useAuth();
  const { handleGateError, openGate } = useMembershipGate();
  const { evaluateFeature } = useAccessTier();
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [addErrorKey, setAddErrorKey] = useState<string | null>(null);
  const [username, setUsername] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const isAddingRef = useRef(false);

  // Adding requires server-side feed parsing, so it is membership-tier. Feeds already added stay
  // visible and playable when a membership lapses — only adding stops.
  const addAccess = evaluateFeature('add_by_rss_add');

  /**
   * A pasted `https://user:pass@host/feed` moves its username and password into their own fields.
   * Only a change of more than one character counts as a paste, so a URL typed by hand is never
   * rewritten under the cursor; the add itself splits any userinfo still in the field.
   */
  const handleFeedUrlChange = useCallback(
    (value: string) => {
      const isPaste = value.length - inputValue.length > 1;
      const split = isPaste ? splitAddByRssPastedUrl(value) : null;
      if (split === null || split.credentials === null) {
        setInputValue(value);
        return;
      }
      setInputValue(split.feedUrl);
      setUsername(split.credentials.username);
      setPassword(split.credentials.password);
    },
    [inputValue, setInputValue]
  );

  const addFeed = useCallback(async () => {
    if (isAddingRef.current) {
      return;
    }

    if (!addAccess.allowed) {
      openGate(addAccess.reason);
      return;
    }

    const typed = resolveTypedCredentials(username, password);
    if (typed.errorKey !== null) {
      setAddErrorKey(typed.errorKey);
      return;
    }

    const resolved = resolveAddByRSSFeedUrlCredentials(
      inputValue,
      typed.credentials?.username,
      typed.credentials?.password
    );
    if (resolved === null || !isValidAddByRssFeedUrl(resolved.feedUrl)) {
      setAddErrorKey('features.add_by_rss.invalid_url');
      return;
    }
    const feedUrl = resolved.feedUrl;
    const credentials = resolved.credentials;
    const authContext = { accessToken, clearSession, refreshToken, setTokens };

    // The keyboard covers the tab bar. Dismiss now so the list and tabs are reachable while parse runs.
    Keyboard.dismiss();
    isAddingRef.current = true;
    setIsAdding(true);
    setAddErrorKey(null);
    onNotice(null);
    try {
      // The follow only flags the feed; the username and password never leave in it.
      await requestWithMobileAuthRefresh(authContext, async (api) =>
        api.reqAccountFollowAddByRSSChannel({
          feed_url: feedUrl,
          image_url: null,
          ...(credentials !== null ? { requires_credentials: true } : {}),
          title: feedUrl,
        })
      );

      // Saved before the parse so a rejected pair stays available to correct on the credentials
      // screen rather than having to be typed again.
      const accountIdText = account?.id_text;
      if (credentials !== null && accountIdText !== undefined) {
        await addByRssCredentialStore.set(accountIdText, feedUrl, credentials);
      }

      const { requestId, result } = await addByRssRepository.parseNow(
        authContext,
        feedUrl,
        credentials
      );
      setInputValue('');
      setUsername('');
      setPassword('');

      const failureLog = buildAddByRssParseFailureLog({
        feedUrl,
        jobKind: ADD_BY_RSS_ADD_LOG_KIND,
        occurredAt: Date.now(),
        requestId,
        result,
      });
      const credentialNoticeKey = credentialNoticeKeyForParse(result);
      if (failureLog === null) {
        onNotice('features.add_by_rss.status_parsed');
      } else {
        void syncEventLogRepository.append(failureLog);
        onNotice(
          credentialNoticeKey ??
            (result.status === 'failed' || result.status === 'parsed'
              ? 'error_log.add_by_rss.parse_failed_notice'
              : 'error_log.add_by_rss.parse_pending_notice')
        );
      }
      await onAfterAdd();
      // Home stays mounted under the tab, so it will not reload on its own.
      homeFeedRefresh.notify();
    } catch (error) {
      if (handleGateError(error)) {
        return;
      }
      void syncEventLogRepository.append(buildAddByRssAddErrorLog(error, feedUrl, Date.now()));
      setAddErrorKey('error_log.add_by_rss.add_failed');
    } finally {
      isAddingRef.current = false;
      setIsAdding(false);
    }
  }, [
    accessToken,
    account?.id_text,
    addAccess,
    clearSession,
    handleGateError,
    inputValue,
    onAfterAdd,
    onNotice,
    openGate,
    password,
    refreshToken,
    setInputValue,
    setTokens,
    username,
  ]);

  return {
    addAccess,
    addErrorKey,
    addFeed,
    handleFeedUrlChange,
    isAdding,
    password,
    setPassword,
    setUsername,
    username,
  };
}
