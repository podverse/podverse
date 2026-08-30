import NetInfo from '@react-native-community/netinfo';
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

import { useAuth } from '../auth/AuthProvider';
import { useQueues } from '../contexts/QueuesProvider';
import { useQueueResourcesLoadActive } from '../hooks/useQueueResourcesLoadActive';
import { attachSyncEventLogSink } from './syncEventLogSink';
import type { SyncTrigger } from './syncJobPlan';
import { planSyncRun } from './syncJobPlan';
import { buildSyncJobs } from './syncJobs';
import type { SyncQueueState } from './syncQueue';
import { syncQueue } from './syncQueue';

/**
 * Owns the sync queue's triggers and publishes its state.
 *
 * Everything here enqueues; nothing runs work inline. A foreground transition or a pull gesture
 * that awaited the network would put the user back behind exactly the requests this queue exists to
 * get out of their way.
 */

type SyncContextValue = {
  /** Ask for a run. Safe to call repeatedly — equivalent queued work collapses. */
  requestSync: (trigger: SyncTrigger) => void;
  state: SyncQueueState;
};

const SyncContext = createContext<SyncContextValue | undefined>(undefined);

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
    return syncQueue.subscribe(setState);
  }, []);

  useEffect(() => {
    return attachSyncEventLogSink();
  }, []);

  const requestSync = useCallback((trigger: SyncTrigger) => {
    const planned = planSyncRun({
      isAuthenticated: isAuthenticatedRef.current,
      trigger,
    });
    if (planned.length === 0) {
      return;
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
  }, []);

  // Signing out drops queued account work rather than letting it run against a session that no
  // longer exists, and clears the store the queue was hydrating.
  useEffect(() => {
    if (status !== 'anonymous') {
      return;
    }
    syncQueue.reset();
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

  useEffect(() => {
    return NetInfo.addEventListener((netState) => {
      // `isInternetReachable` is null until the first probe resolves; treat that as connected so a
      // slow probe cannot hold the queue back on a working network.
      const isReachable = netState.isConnected === true && netState.isInternetReachable !== false;
      syncQueue.setNetworkReachable(isReachable);

      if (isReachable) {
        requestSync('connectivity-restored');
      }
    });
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
