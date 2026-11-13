import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard } from 'react-native';

import { canSubmitAddByRssCredentials } from '@podverse/helpers-validation/client';

import { useAuth } from '../../auth/AuthProvider';
import { addByRssCredentialStore, addByRssRepository } from '../../data';
import { syncEventLogRepository } from '../../data/repositories';
import { useAddByRssParsePath } from '../../hooks/useAddByRssParsePath';
import { buildAddByRssParseFailureLog } from '../../lib/addByRss/addByRssErrorLog';
import {
  credentialNoticeKeyForParse,
  resolveAddByRssCredentialWriteOwner,
  toAddByRssCredentials,
} from '../../lib/addByRss/credentials';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';
import { ADD_BY_RSS_ADD_LOG_KIND } from '../../sync/syncJobKinds';

export type AddByRssCredentialsForm = {
  canSave: boolean;
  /** False until the device store has been read for the current feed URL. */
  isReady: boolean;
  isSaving: boolean;
  noticeKey: string | null;
  password: string;
  saveAndCheck: () => Promise<void>;
  setNoticeKey: (noticeKey: string | null) => void;
  setPassword: (password: string) => void;
  setUsername: (username: string) => void;
  username: string;
};

/**
 * Username and password for one add-by-RSS feed, kept on this device for the signed-in account,
 * or for the signed-out user.
 *
 * The fields are filled from `addByRssCredentialStore` when the feed URL changes. A later reload
 * of the same URL leaves whatever was typed. Save and Check stores the pair, parses, and calls
 * `onSaved` only when that parse produced a usable feed.
 */
export function useAddByRssCredentialsForm({
  feed,
  onSaved,
}: {
  feed: MobileAddByRSSFeedRecord | null;
  onSaved: () => void;
}): AddByRssCredentialsForm {
  const { accessToken, account, clearSession, refreshToken, setTokens } = useAuth();
  const { handleGateError, openGate } = useMembershipGate();
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const parsePath = useAddByRssParsePath();
  const [username, setUsernameState] = useState<string>('');
  const [password, setPasswordState] = useState<string>('');
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [prefilledUrl, setPrefilledUrl] = useState<string | null>(null);
  const isBusyRef = useRef(false);
  const editedRef = useRef(false);
  const lastAuthFailureRef = useRef(feed?.lastAuthFailure);
  lastAuthFailureRef.current = feed?.lastAuthFailure;

  const feedUrl = feed?.feedUrl ?? null;
  const isReady = feedUrl === null || prefilledUrl === feedUrl;

  useEffect(() => {
    if (feedUrl === null) {
      return;
    }

    editedRef.current = false;
    let cancelled = false;
    void (async () => {
      const stored = await addByRssCredentialStore.getForCurrentAccount(feedUrl);
      if (cancelled) {
        return;
      }
      if (!editedRef.current) {
        setUsernameState(stored?.username ?? '');
        setPasswordState(stored?.password ?? '');
        setNoticeKey(
          lastAuthFailureRef.current === 'credentials_rejected'
            ? 'features.add_by_rss.credentials_rejected'
            : null
        );
      }
      setPrefilledUrl(feedUrl);
    })();

    return () => {
      cancelled = true;
    };
  }, [feedUrl]);

  const authContext = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const setUsername = useCallback((value: string) => {
    editedRef.current = true;
    setUsernameState(value);
  }, []);

  const setPassword = useCallback((value: string) => {
    editedRef.current = true;
    setPasswordState(value);
  }, []);

  const saveAndCheck = useCallback(async () => {
    if (feed === null || isBusyRef.current) {
      return;
    }
    const checkAccess = evaluateFeature('add_by_rss_add');
    if (parsePath === 'server' && isTierKnown && !checkAccess.allowed) {
      openGate(checkAccess.reason);
      return;
    }
    const credentials = toAddByRssCredentials(username, password);
    if (credentials === null) {
      setNoticeKey('features.add_by_rss.basic_auth_required_both');
      return;
    }
    const credentialOwner = resolveAddByRssCredentialWriteOwner(
      parsePath,
      account?.id_text ?? null
    );
    if (credentialOwner === null) {
      setNoticeKey('features.add_by_rss.credentials_check_failed');
      return;
    }

    Keyboard.dismiss();
    isBusyRef.current = true;
    setIsSaving(true);
    setNoticeKey(null);
    try {
      await addByRssCredentialStore.set(credentialOwner, feed.feedUrl, credentials);
      const { requestId, result } = await addByRssRepository.parseNowByPath(
        authContext,
        feed.feedUrl,
        credentials,
        { path: parsePath }
      );
      // Home stays mounted under its tab, so it will not pick up the new state on its own.
      homeFeedRefresh.notify();

      const failureLog = buildAddByRssParseFailureLog({
        feedUrl: feed.feedUrl,
        jobKind: ADD_BY_RSS_ADD_LOG_KIND,
        occurredAt: Date.now(),
        requestId,
        result,
      });
      if (failureLog === null) {
        onSaved();
        return;
      }
      void syncEventLogRepository.append(failureLog);
      setNoticeKey(
        credentialNoticeKeyForParse(result) ?? 'features.add_by_rss.credentials_check_failed'
      );
    } catch (error) {
      if (handleGateError(error)) {
        return;
      }
      setNoticeKey('features.add_by_rss.credentials_check_failed');
    } finally {
      isBusyRef.current = false;
      setIsSaving(false);
    }
  }, [
    account?.id_text,
    authContext,
    evaluateFeature,
    feed,
    handleGateError,
    isTierKnown,
    onSaved,
    openGate,
    parsePath,
    password,
    username,
  ]);

  const canSave = canSubmitAddByRssCredentials(username, password);

  return {
    canSave,
    isReady,
    isSaving,
    noticeKey,
    password,
    saveAndCheck,
    setNoticeKey,
    setPassword,
    setUsername,
    username,
  };
}
