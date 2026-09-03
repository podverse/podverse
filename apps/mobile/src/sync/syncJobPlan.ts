import type { SyncJobKind } from './syncJobKinds';
import type { SyncJobPriority } from './syncQueue';

/**
 * What causes a sync run. A trigger only ever enqueues — it never runs work inline, or the thing it
 * fired from (a foreground transition, a pull gesture) ends up waiting on the network.
 */
export type SyncTrigger =
  'app-foreground' | 'app-start' | 'connectivity-restored' | 'pull-to-refresh' | 'sign-in';

export type PlannedSyncJob = {
  kind: SyncJobKind;
  priority: SyncJobPriority;
};

export type SyncPlanInput = {
  isAuthenticated: boolean;
  trigger: SyncTrigger;
};

/**
 * The jobs a trigger schedules up front.
 *
 * Only the roots appear here. Work that depends on a payload we do not have yet is enqueued by the
 * job that discovers it — subscription pages come from the account refresh, further pages come from
 * the page before them, and the per-channel episode passes come from the scan that finds them.
 *
 * Which follows exist is an account question; what those follows have published is not. A
 * signed-out device holds its own subscriptions and their episodes are public, so it syncs
 * episodes even though it has no account state to reconcile.
 */
export const planSyncRun = ({ isAuthenticated, trigger }: SyncPlanInput): PlannedSyncJob[] => {
  // A pull gesture is the one case where somebody is watching, so it goes ahead of whatever
  // opportunistic pass may already be queued.
  const priority: SyncJobPriority = trigger === 'pull-to-refresh' ? 'user' : 'background';

  // Runs on every device. Signed in, the scan the account walk enqueues afterwards picks up
  // anything this one could not have known about yet.
  const planned: PlannedSyncJob[] = [{ kind: 'channel-items-scan', priority }];

  if (!isAuthenticated) {
    return planned;
  }

  planned.push({ kind: 'account-refresh', priority }, { kind: 'queue-hydrate', priority });

  // Membership-tier and checked when the job runs, so a lapsed member keeps their feeds without
  // the device asking for work the server would refuse.
  planned.push({ kind: 'add-by-rss-refresh', priority });

  // Device registration is a per-session handshake, not reconciliation. Repeating it on every
  // foreground would spend a request to tell the server something it already knows.
  if (trigger === 'app-start' || trigger === 'sign-in') {
    planned.push({ kind: 'push-device-registration', priority });
  }

  return planned;
};
