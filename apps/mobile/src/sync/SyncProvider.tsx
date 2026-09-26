import type { PropsWithChildren } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

import { deriveMembershipState, evaluateFeatureAccess } from '@podverse/helpers';

import { useAuth } from '../auth/AuthProvider';
import { useQueues } from '../contexts/QueuesProvider';
import { accountRepository } from '../data/repositories/accountRepository';
import {
  isAutoDownloadCatchUpReady,
  markAutoDownloadCatchUpReady,
  noteAutoDownloadSyncRunning,
  requestAutoDownloadCatchUp,
  takeAutoDownloadCatchUpIfReady,
} from '../downloads/autoDownloadCatchUpSession';
import { runAutoDownloadEvaluate } from '../downloads/autoDownloadEvaluate';
import {
  startAutoDownloadWifiRetryListener,
  stopAutoDownloadWifiRetryListener,
} from '../downloads/autoDownloadWifiRetry';
import { downloadManager } from '../downloads/downloadManager';
import { useQueueResourcesLoadActive } from '../hooks/useQueueResourcesLoadActive';
import {
  getConnectivity,
  reportUserNetworkAction,
  subscribeConnectivity,
} from '../net/connectivity';
import {
  hydrateOfflineMode,
  isOfflineModeEnabled,
  isSyncNetworkUsable,
  subscribeOfflineMode,
} from '../prefs/offlineMode';
import { publishPlaybackPositionAdoptions } from './playbackPositionAdoption';
import { publishPlaybackReconcileConflicts } from './playbackReconcileConflict';
import { attachSyncEventLogSink } from './syncEventLogSink';
import type { SyncTrigger } from './syncJobPlan';
import { planSyncRun } from './syncJobPlan';
import { buildSyncJobs } from './syncJobs';
import type { SyncQueueState } from './syncQueue';
import { syncQueue } from './syncQueue';

/**
 * Owns the sync queue's triggers and publishes its state.
 *
 * Sync triggers only enqueue. The foreground auto-download catch-up starts after that queue is
 * idle, and it is not awaited here, so opening the app does not wait on episode downloads.
 */

type SyncContextValue = {
  /** Ask for a run. Safe to call repeatedly — equivalent queued work collapses. */
  requestSync: (trigger: SyncTrigger) => void;
  state: SyncQueueState;
};

const startAutoDownloadCatchUpIfIdle = (): void => {
  if (syncQueue.getState().status !== 'idle') {
    return;
  }
  markAutoDownloadCatchUpReady();
  if (!isAutoDownloadCatchUpReady(true) || isOfflineModeEnabled()) {
    return;
  }

  void (async () => {
    const account = await accountRepository.getSnapshot();
    const membershipAllows =
      account !== null &&
      evaluateFeatureAccess('auto_download', deriveMembershipState(account)).allowed;
    if (!membershipAllows || isOfflineModeEnabled() || syncQueue.getState().status !== 'idle') {
      return;
    }
    if (!takeAutoDownloadCatchUpIfReady(true)) {
      return;
    }
    try {
      await runAutoDownloadEvaluate({ membershipAllows: true, mode: 'catch_up' });
    } catch (error: unknown) {
      if (__DEV__) {
        console.warn('[auto-download] catch-up failed', error);
      }
    }
  })();
};

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

/**
 * Triggers that mean somebody turned up expecting fresh data.
 *
 * These probe the network immediately instead of waiting out a backoff step, so a user who pulls
 * to refresh during an outage gets an answer at the speed they asked for it.
 * `connectivity-restored` is excluded because it originates in the connectivity machine; reporting
 * it back would be a loop.
 */
const NETWORK_INTENT_TRIGGERS = new Set<SyncTrigger>([
  'add-by-rss-pull-to-refresh',
  'app-foreground',
  'app-start',
  'pull-to-refresh',
  'sign-in',
]);

export function SyncProvider({ children }: PropsWithChildren) {
  const { accessToken, clearSession, refreshToken, setAccount, setTokens, status } = useAuth();
  const { setActiveQueue, setActiveQueueUpcomingResources, setQueues } = useQueues();
  const loadActiveQueue = useQueueResourcesLoadActive();
  const [state, setState] = useState<SyncQueueState>(() => syncQueue.getState());

  // Jobs read credentials when they run, not when they were queued, so the queue never carries a
  // token that expired while it waited.
  const depsRef = useRef({ accessToken, clearSession, refreshToken, setTokens });
  useEffect(() => {
    depsRef.current = { accessToken, clearSession, refreshToken, setTokens };
  }, [accessToken, clearSession, refreshToken, setTokens]);

  const loadActiveQueueRef = useRef(loadActiveQueue);
  useEffect(() => {
    loadActiveQueueRef.current = loadActiveQueue;
  }, [loadActiveQueue]);

  const setAccountRef = useRef(setAccount);
  useEffect(() => {
    setAccountRef.current = setAccount;
  }, [setAccount]);

  const isAuthenticatedRef = useRef(status === 'authenticated');
  useEffect(() => {
    isAuthenticatedRef.current = status === 'authenticated';
  }, [status]);

  useEffect(() => {
    return syncQueue.subscribe((next) => {
      setState(next);
      if (next.status === 'running') {
        noteAutoDownloadSyncRunning();
      }
      if (next.status === 'idle') {
        startAutoDownloadCatchUpIfIdle();
      }
    });
  }, []);

  useEffect(() => {
    return attachSyncEventLogSink();
  }, []);

  useEffect(() => {
    startAutoDownloadWifiRetryListener();
    void downloadManager
      .hydrate()
      .then(() => downloadManager.reconcileInterruptedDownloads())
      .catch((error: unknown) => {
        if (__DEV__) {
          console.warn('[downloads] launch reconcile failed', error);
        }
      });
    return () => {
      stopAutoDownloadWifiRetryListener();
    };
  }, []);

  const requestSync = useCallback((trigger: SyncTrigger) => {
    if (trigger === 'app-foreground' || trigger === 'app-start' || trigger === 'sign-in') {
      requestAutoDownloadCatchUp();
      if (syncQueue.getState().status === 'running') {
        noteAutoDownloadSyncRunning();
      }
    }

    const planned = planSyncRun({
      isAuthenticated: isAuthenticatedRef.current,
      trigger,
    });
    if (planned.length === 0) {
      startAutoDownloadCatchUpIfIdle();
      return;
    }

    if (NETWORK_INTENT_TRIGGERS.has(trigger)) {
      reportUserNetworkAction();
    }

    syncQueue.enqueue(
      buildSyncJobs(planned, {
        getAuthContext: () => depsRef.current,
        loadActiveQueue: async () => {
          await loadActiveQueueRef.current();
        },
        setAccount: (account) => {
          setAccountRef.current(account);
        },
      })
    );
    startAutoDownloadCatchUpIfIdle();
  }, []);

  // Signing out drops queued account work, the in-memory queue, and pending playback conflicts.
  // Those conflicts name queue ids the next account does not own.
  useEffect(() => {
    if (status !== 'anonymous') {
      return;
    }
    syncQueue.reset();
    publishPlaybackReconcileConflicts([]);
    publishPlaybackPositionAdoptions([]);
    setQueues([]);
    setActiveQueue(null);
    setActiveQueueUpcomingResources([]);
  }, [setActiveQueue, setActiveQueueUpcomingResources, setQueues, status]);

  /**
   * Run once the session resolves, whichever way it resolves.
   *
   * A signed-out device still has work: its subscriptions are local and their episodes are public,
   * so it syncs them with no account involved. Only the account-backed jobs wait for a session.
   *
   * Arriving at `authenticated` from the initial resolve is a cold launch that was already signed
   * in; arriving from `anonymous` is somebody signing in. They queue the same work today, but the
   * log reads very differently, so the distinction is worth keeping.
   */
  const previousStatusRef = useRef(status);
  useEffect(() => {
    const previousStatus = previousStatusRef.current;
    previousStatusRef.current = status;

    if (status === 'unknown' || status === previousStatus) {
      return;
    }

    requestSync(
      status === 'authenticated' && previousStatus === 'anonymous' ? 'sign-in' : 'app-start'
    );
  }, [requestSync, status]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active') {
        requestSync('app-foreground');
      }
    });

    return () => {
      subscription.remove();
    };
  }, [requestSync]);

  /**
   * The queue runs when the network is usable and the user has not asked us to stay put.
   *
   * Reachability is the derived connectivity state rather than a raw platform reading, so the
   * queue parks on a server outage as readily as on a dead radio, and restores only once something
   * has actually succeeded.
   */
  useEffect(() => {
    let connectivity = getConnectivity();
    let offlineModeEnabled = false;

    const applyReachability = (allowRestore: boolean): void => {
      const usable = isSyncNetworkUsable(connectivity === 'online', offlineModeEnabled);
      syncQueue.setNetworkReachable(usable);
      if (usable && allowRestore) {
        requestSync('connectivity-restored');
      }
    };

    void hydrateOfflineMode().then((enabled) => {
      offlineModeEnabled = enabled;
      // Park immediately if Offline Mode was left on from a previous session.
      if (enabled) {
        syncQueue.setNetworkReachable(false);
      }
    });

    const unsubscribeOffline = subscribeOfflineMode((enabled) => {
      const wasEnabled = offlineModeEnabled;
      offlineModeEnabled = enabled;
      if (enabled) {
        syncQueue.setNetworkReachable(false);
        return;
      }
      // Turning Offline Mode off resumes only when the network is also usable.
      if (wasEnabled) {
        applyReachability(true);
      }
    });

    const unsubscribeConnectivity = subscribeConnectivity((next) => {
      connectivity = next;
      applyReachability(true);
    });

    return () => {
      unsubscribeOffline();
      unsubscribeConnectivity();
    };
  }, [requestSync]);

  const value = useMemo<SyncContextValue>(() => {
    return { requestSync, state };
  }, [requestSync, state]);

  return <SyncContext.Provider value={value}>{children}</SyncContext.Provider>;
}

export const useSync = (): SyncContextValue => {
  const context = useContext(SyncContext);

  if (context === undefined) {
    throw new Error('useSync must be used within SyncProvider');
  }

  return context;
};
