import { useCallback, useEffect, useRef, useState } from 'react';

import type {
  DTOAccountTasteProfileHiddenRow,
  DTOAccountTasteProfileRow,
  TasteProfilePage,
  TasteProfileRows,
} from '@podverse/helpers';
import {
  appendTasteProfilePage,
  fetchTasteProfilePages,
  TASTE_PROFILE_PAGE_LIMIT,
} from '@podverse/helpers';

import { useAuth } from '../auth/AuthProvider';
import type { AuthRequestDeps } from '../auth/authRequestWithRefresh';
import { requestWithMobileAuthRefresh } from '../auth/authRequestWithRefresh';

export type TasteProfileListState<Row> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; data: TasteProfileRows<Row>; loadingMore: boolean; loadMoreFailed: boolean };

export type UseTasteProfileListsResult = {
  profile: TasteProfileListState<DTOAccountTasteProfileRow>;
  hidden: TasteProfileListState<DTOAccountTasteProfileHiddenRow>;
  channelHidden: TasteProfileListState<DTOAccountTasteProfileHiddenRow>;
  /** `channel.id_text` values with a hide, unhide, or weight apply in flight. */
  pendingChannelIds: ReadonlySet<string>;
  actionFailed: boolean;
  retry: () => void;
  loadMoreProfile: () => void;
  loadMoreHidden: () => void;
  loadMoreChannelHidden: () => void;
  hideShow: (channelIdText: string) => Promise<boolean>;
  unhideShow: (channelIdText: string, addToTasteProfile: boolean) => Promise<boolean>;
  unhideChannelFromLists: (channelIdText: string) => Promise<boolean>;
  applyWeight: (channelIdText: string, weight: number) => Promise<boolean>;
};

type KeyedRow = { channel: { id_text: string } };

/**
 * One paged list. A response applies only while this list's generation and request sequence
 * still match the values taken when the request started, so a slow response never overwrites
 * a newer one.
 */
function useTasteProfileList<Row extends KeyedRow>(
  fetchPage: (page: number) => Promise<TasteProfilePage<Row>>
) {
  const generationRef = useRef(0);
  const [state, setState] = useState<TasteProfileListState<Row>>({ status: 'idle' });
  const stateRef = useRef<TasteProfileListState<Row>>(state);
  const requestSeqRef = useRef(0);

  const applyState = useCallback((next: TasteProfileListState<Row>) => {
    stateRef.current = next;
    setState(next);
  }, []);

  const startRequest = useCallback(() => {
    requestSeqRef.current += 1;
    const generation = generationRef.current;
    const seq = requestSeqRef.current;
    return () => generation === generationRef.current && seq === requestSeqRef.current;
  }, []);

  const invalidate = useCallback(() => {
    generationRef.current += 1;
  }, []);

  const fetchPages = useCallback(
    async (pageCount: number) => {
      const isCurrent = startRequest();
      try {
        const data = await fetchTasteProfilePages(fetchPage, pageCount);
        if (isCurrent()) {
          applyState({ status: 'ready', data, loadingMore: false, loadMoreFailed: false });
        }
      } catch (error) {
        console.warn('[useTasteProfileLists] load failed', error);
        if (isCurrent()) {
          applyState({ status: 'error' });
        }
      }
    },
    [applyState, fetchPage, startRequest]
  );

  const reset = useCallback(() => {
    requestSeqRef.current += 1;
    applyState({ status: 'loading' });
  }, [applyState]);

  const idle = useCallback(() => {
    requestSeqRef.current += 1;
    applyState({ status: 'idle' });
  }, [applyState]);

  const reload = useCallback(() => {
    reset();
    void fetchPages(1);
  }, [fetchPages, reset]);

  /** Reloads every page already shown, keeping the current rows on screen until it lands. */
  const refetch = useCallback(() => {
    const current = stateRef.current;
    void fetchPages(current.status === 'ready' ? current.data.loadedPages : 1);
  }, [fetchPages]);

  const loadMore = useCallback(() => {
    const current = stateRef.current;
    if (current.status !== 'ready' || !current.data.hasMore || current.loadingMore) {
      return;
    }
    const pageNumber = current.data.loadedPages + 1;
    const isCurrent = startRequest();
    applyState({ ...current, loadingMore: true, loadMoreFailed: false });
    void (async () => {
      try {
        const page = await fetchPage(pageNumber);
        const latest = stateRef.current;
        if (isCurrent() && latest.status === 'ready') {
          applyState({
            status: 'ready',
            data: appendTasteProfilePage(latest.data, page, pageNumber),
            loadingMore: false,
            loadMoreFailed: false,
          });
        }
      } catch (error) {
        console.warn('[useTasteProfileLists] load more failed', error);
        const latest = stateRef.current;
        if (isCurrent() && latest.status === 'ready') {
          applyState({ ...latest, loadingMore: false, loadMoreFailed: true });
        }
      }
    })();
  }, [applyState, fetchPage, startRequest]);

  return { state, reset, idle, reload, refetch, loadMore, invalidate };
}

/**
 * Loads one list when it is opened, when the account or Taste Profile consent changes, and
 * when the listener presses Try Again. A failed load stays on screen until one of those.
 */
function useReloadWhenActive(
  active: boolean,
  reloadKey: string | null,
  retryCount: number,
  idle: () => void,
  reload: () => void,
  invalidate: () => void
): void {
  useEffect(() => {
    if (reloadKey === null || !active) {
      idle();
    } else {
      reload();
    }
    return () => {
      invalidate();
    };
  }, [active, idle, invalidate, reload, reloadKey, retryCount]);
}

/**
 * The signed-in listener's Taste Profile, Removed from Recommendations, and Hidden Channels lists.
 * State lives only in this hook. Each list loads when it is opened, and again when the account
 * or its Taste Profile consent changes, so a sign-out or account switch never shows the previous
 * account's rows. Try Again reloads every open list. A token refresh does not reload: requests
 * read the latest auth values through a ref.
 */
export function useTasteProfileLists(options: {
  hiddenActive: boolean;
  profileActive: boolean;
  channelHiddenActive: boolean;
}): UseTasteProfileListsResult {
  const { accessToken, account, clearSession, refreshToken, setTokens } = useAuth();
  const authRef = useRef<AuthRequestDeps>({ accessToken, clearSession, refreshToken, setTokens });
  const profileActiveRef = useRef(options.profileActive);
  const hiddenActiveRef = useRef(options.hiddenActive);
  const channelHiddenActiveRef = useRef(options.channelHiddenActive);
  profileActiveRef.current = options.profileActive;
  hiddenActiveRef.current = options.hiddenActive;
  channelHiddenActiveRef.current = options.channelHiddenActive;
  // Declared before the reload effect so a reload in the same commit sends the new token.
  useEffect(() => {
    authRef.current = { accessToken, clearSession, refreshToken, setTokens };
  }, [accessToken, clearSession, refreshToken, setTokens]);
  const actionGenerationRef = useRef(0);

  const fetchProfilePage = useCallback(
    (page: number): Promise<TasteProfilePage<DTOAccountTasteProfileRow>> =>
      requestWithMobileAuthRefresh(authRef.current, (api) =>
        api.reqAccountTasteProfile({ page, limit: TASTE_PROFILE_PAGE_LIMIT })
      ),
    []
  );

  const fetchHiddenPage = useCallback(
    (page: number): Promise<TasteProfilePage<DTOAccountTasteProfileHiddenRow>> =>
      requestWithMobileAuthRefresh(authRef.current, (api) =>
        api.reqAccountTasteProfileHidden({ page, limit: TASTE_PROFILE_PAGE_LIMIT })
      ),
    []
  );

  const fetchChannelHiddenPage = useCallback(
    (page: number): Promise<TasteProfilePage<DTOAccountTasteProfileHiddenRow>> =>
      requestWithMobileAuthRefresh(authRef.current, (api) =>
        api.reqAccountChannelHidden({ page, limit: TASTE_PROFILE_PAGE_LIMIT })
      ),
    []
  );

  const {
    state: profile,
    idle: idleProfile,
    reload: reloadProfile,
    refetch: refetchProfile,
    loadMore: loadMoreProfile,
    invalidate: invalidateProfile,
  } = useTasteProfileList(fetchProfilePage);
  const {
    state: hidden,
    idle: idleHidden,
    reload: reloadHidden,
    refetch: refetchHidden,
    loadMore: loadMoreHidden,
    invalidate: invalidateHidden,
  } = useTasteProfileList(fetchHiddenPage);
  const {
    state: channelHidden,
    idle: idleChannelHidden,
    reload: reloadChannelHidden,
    refetch: refetchChannelHidden,
    loadMore: loadMoreChannelHidden,
    invalidate: invalidateChannelHidden,
  } = useTasteProfileList(fetchChannelHiddenPage);
  const [pendingChannelIds, setPendingChannelIds] = useState<ReadonlySet<string>>(
    () => new Set<string>()
  );
  const pendingRef = useRef<ReadonlySet<string>>(pendingChannelIds);
  const [actionFailed, setActionFailed] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const updatePending = useCallback(
    (update: (current: ReadonlySet<string>) => ReadonlySet<string>) => {
      const next = update(pendingRef.current);
      pendingRef.current = next;
      setPendingChannelIds(next);
    },
    []
  );

  const settings = account?.account_settings;
  const reloadKey =
    account === null
      ? null
      : `${account.id_text}|${settings?.listen_stats_accepted}|${settings?.listen_stats_agreement_version}`;

  useEffect(() => {
    updatePending(() => new Set<string>());
    setActionFailed(false);
  }, [reloadKey, retryCount, updatePending]);

  useEffect(() => {
    return () => {
      actionGenerationRef.current += 1;
    };
  }, [reloadKey]);

  useReloadWhenActive(
    options.profileActive,
    reloadKey,
    retryCount,
    idleProfile,
    reloadProfile,
    invalidateProfile
  );
  useReloadWhenActive(
    options.hiddenActive,
    reloadKey,
    retryCount,
    idleHidden,
    reloadHidden,
    invalidateHidden
  );
  useReloadWhenActive(
    options.channelHiddenActive,
    reloadKey,
    retryCount,
    idleChannelHidden,
    reloadChannelHidden,
    invalidateChannelHidden
  );

  const retry = useCallback(() => {
    setRetryCount((count) => count + 1);
  }, []);

  const runAction = useCallback(
    async (channelIdText: string, request: () => Promise<unknown>): Promise<boolean> => {
      if (pendingRef.current.has(channelIdText)) {
        return false;
      }
      const generation = actionGenerationRef.current;
      updatePending((current) => new Set([...current, channelIdText]));
      setActionFailed(false);
      let succeeded = false;
      try {
        await request();
        succeeded = true;
      } catch (error) {
        console.warn('[useTasteProfileLists] action failed', error);
        if (generation === actionGenerationRef.current) {
          setActionFailed(true);
        }
      } finally {
        if (generation === actionGenerationRef.current) {
          updatePending((current) => {
            const next = new Set(current);
            next.delete(channelIdText);
            return next;
          });
          if (profileActiveRef.current) {
            refetchProfile();
          }
          if (hiddenActiveRef.current) {
            refetchHidden();
          }
          if (channelHiddenActiveRef.current) {
            refetchChannelHidden();
          }
        }
      }
      return succeeded && generation === actionGenerationRef.current;
    },
    [refetchHidden, refetchProfile, refetchChannelHidden, updatePending]
  );

  const hideShow = useCallback(
    (channelIdText: string) =>
      runAction(channelIdText, () =>
        requestWithMobileAuthRefresh(authRef.current, (api) =>
          api.reqAccountTasteProfileHide({ channel_id_text: channelIdText })
        )
      ),
    [runAction]
  );

  const unhideShow = useCallback(
    (channelIdText: string, addToTasteProfile: boolean) =>
      runAction(channelIdText, () =>
        requestWithMobileAuthRefresh(authRef.current, (api) =>
          api.reqAccountTasteProfileUnhide({
            channel_id_text: channelIdText,
            add_to_taste_profile: addToTasteProfile,
          })
        )
      ),
    [runAction]
  );

  const unhideChannelFromLists = useCallback(
    (channelIdText: string) =>
      runAction(channelIdText, () =>
        requestWithMobileAuthRefresh(authRef.current, (api) =>
          api.reqAccountChannelHiddenUnhide({ channel_id_text: channelIdText })
        )
      ),
    [runAction]
  );

  const applyWeight = useCallback(
    (channelIdText: string, weight: number) =>
      runAction(channelIdText, () =>
        requestWithMobileAuthRefresh(authRef.current, (api) =>
          api.reqAccountTasteProfileSetWeight({ channel_id_text: channelIdText, weight })
        )
      ),
    [runAction]
  );

  return {
    profile,
    hidden,
    channelHidden,
    pendingChannelIds,
    actionFailed,
    retry,
    loadMoreProfile,
    loadMoreHidden,
    loadMoreChannelHidden,
    hideShow,
    unhideShow,
    unhideChannelFromLists,
    applyWeight,
  };
}
