import { describe, expect, it, vi } from 'vitest';

import type { SyncJobKind } from './syncJobKinds';
import { planSyncRun } from './syncJobPlan';
import type { SyncJob, SyncJobFailure, SyncJobPriority, SyncQueueState } from './syncQueue';
import { createSyncQueue } from './syncQueue';

const flush = async (): Promise<void> => {
  await new Promise((resolve) => setTimeout(resolve, 0));
};

type JobOverrides = {
  dedupeKey?: string;
  kind?: SyncJobKind;
  labelKey?: string;
  priority?: SyncJobPriority;
  run: SyncJob['run'];
  timeoutMs?: number;
};

const job = (overrides: JobOverrides): SyncJob => {
  return {
    dedupeKey: overrides.dedupeKey ?? 'account-refresh',
    kind: overrides.kind ?? 'account-refresh',
    labelKey: overrides.labelKey ?? 'sync.job.account',
    run: overrides.run,
    ...(overrides.priority !== undefined ? { priority: overrides.priority } : {}),
    ...(overrides.timeoutMs !== undefined ? { timeoutMs: overrides.timeoutMs } : {}),
  };
};

describe('createSyncQueue', () => {
  it('runs one job at a time even when several are enqueued together', async () => {
    const queue = createSyncQueue();
    let concurrent = 0;
    let maxConcurrent = 0;
    const order: string[] = [];

    const tracked = (kind: string): SyncJob =>
      job({
        dedupeKey: kind,
        run: async () => {
          concurrent += 1;
          maxConcurrent = Math.max(maxConcurrent, concurrent);
          order.push(kind);
          await flush();
          concurrent -= 1;
        },
      });

    queue.enqueue([tracked('a'), tracked('b'), tracked('c')]);
    await vi.waitFor(() => {
      expect(queue.getState().status).toBe('idle');
    });

    expect(maxConcurrent).toBe(1);
    expect(order).toEqual(['a', 'b', 'c']);
  });

  it('collapses a duplicate that is still waiting instead of running it twice', async () => {
    const queue = createSyncQueue();
    const run = vi.fn(async () => {
      await flush();
    });
    const blocker = vi.fn(async () => {
      await flush();
    });

    queue.enqueue(job({ dedupeKey: 'blocker', kind: 'queue-hydrate', run: blocker }));
    queue.enqueue(job({ dedupeKey: 'subscriptions:1', kind: 'subscriptions-page', run }));
    queue.enqueue(job({ dedupeKey: 'subscriptions:1', kind: 'subscriptions-page', run }));

    await vi.waitFor(() => {
      expect(queue.getState().status).toBe('idle');
    });

    expect(run).toHaveBeenCalledTimes(1);
  });

  it('lets a user-priority job overtake background work already waiting', async () => {
    const queue = createSyncQueue();
    const order: string[] = [];

    const tracked = (kind: string, priority?: 'user'): SyncJob =>
      job({
        dedupeKey: kind,
        ...(priority !== undefined ? { priority } : {}),
        run: async () => {
          order.push(kind);
          await flush();
        },
      });

    queue.enqueue(tracked('running'));
    queue.enqueue(tracked('background-1'));
    queue.enqueue(tracked('background-2'));
    queue.enqueue(tracked('user', 'user'));

    await vi.waitFor(() => {
      expect(queue.getState().status).toBe('idle');
    });

    expect(order).toEqual(['running', 'user', 'background-1', 'background-2']);
  });

  it('grows the total when a running job discovers more work', async () => {
    const queue = createSyncQueue();
    const totals: number[] = [];
    queue.subscribe((state: SyncQueueState) => {
      totals.push(state.totalCount);
    });

    queue.enqueue(
      job({
        dedupeKey: 'page:1',
        kind: 'subscriptions-page',
        run: async (context) => {
          context.enqueue([
            job({ dedupeKey: 'page:2', kind: 'subscriptions-page', run: async () => undefined }),
            job({ dedupeKey: 'page:3', kind: 'subscriptions-page', run: async () => undefined }),
          ]);
        },
      })
    );

    await vi.waitFor(() => {
      expect(queue.getState().status).toBe('idle');
    });

    expect(Math.max(...totals)).toBe(3);
  });

  it('skips a failing job, reports it, and finishes the rest of the run', async () => {
    const queue = createSyncQueue();
    const failures: SyncJobFailure[] = [];
    queue.subscribeToFailures((failure) => {
      failures.push(failure);
    });

    const after = vi.fn(async () => undefined);

    queue.enqueue([
      job({
        dedupeKey: 'boom',
        kind: 'followed-playlists',
        run: async () => {
          throw Object.assign(new Error('Request failed'), {
            response: { status: 500 },
          });
        },
      }),
      job({ dedupeKey: 'after', kind: 'queue-hydrate', run: after }),
    ]);

    await vi.waitFor(() => {
      expect(queue.getState().status).toBe('idle');
    });

    expect(after).toHaveBeenCalledTimes(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]?.errorCode).toBe('http_500');
    expect(failures[0]?.isOffline).toBe(false);
  });

  it('parks the run when a job fails because the network is unreachable', async () => {
    const queue = createSyncQueue();
    const later = vi.fn(async () => undefined);

    queue.enqueue([
      job({
        dedupeKey: 'offline',
        run: async () => {
          throw Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' });
        },
      }),
      job({ dedupeKey: 'later', kind: 'queue-hydrate', run: later }),
    ]);

    await vi.waitFor(() => {
      expect(queue.getState().status).toBe('paused');
    });
    expect(later).not.toHaveBeenCalled();

    queue.setNetworkReachable(true);

    await vi.waitFor(() => {
      expect(queue.getState().status).toBe('idle');
    });
    expect(later).toHaveBeenCalledTimes(1);
  });

  it('gives up on a job that outlives its budget so the queue head cannot wedge', async () => {
    const queue = createSyncQueue({ defaultTimeoutMs: 10 });
    const failures: SyncJobFailure[] = [];
    queue.subscribeToFailures((failure) => {
      failures.push(failure);
    });
    const after = vi.fn(async () => undefined);

    queue.enqueue([
      job({
        dedupeKey: 'hangs',
        run: async (context) => {
          await new Promise<void>((resolve) => {
            context.abortController.signal.addEventListener('abort', () => {
              resolve();
            });
          });
        },
      }),
      job({ dedupeKey: 'after', kind: 'queue-hydrate', run: after }),
    ]);

    await vi.waitFor(() => {
      expect(queue.getState().status).toBe('idle');
    });

    expect(failures[0]?.errorCode).toBe('sync_job_timeout');
    expect(after).toHaveBeenCalledTimes(1);
  });

  it('returns to idle with counters cleared once the queue drains', async () => {
    const queue = createSyncQueue();

    queue.enqueue(job({ dedupeKey: 'only', run: async () => undefined }));
    await vi.waitFor(() => {
      expect(queue.getState().status).toBe('idle');
    });

    expect(queue.getState()).toEqual({
      activeKind: null,
      activeLabelKey: null,
      completedCount: 0,
      pendingCount: 0,
      status: 'idle',
      totalCount: 0,
    });
  });
});

describe('planSyncRun', () => {
  it('syncs episodes for a signed-out device but nothing that needs an account', () => {
    const kinds = planSyncRun({ isAuthenticated: false, trigger: 'app-start' }).map(
      (planned) => planned.kind
    );

    expect(kinds).toEqual(['channel-items-scan']);
  });

  it('adds the account-backed work once signed in', () => {
    const kinds = planSyncRun({ isAuthenticated: true, trigger: 'app-foreground' }).map(
      (planned) => planned.kind
    );

    expect(kinds).toContain('channel-items-scan');
    expect(kinds).toContain('account-refresh');
    expect(kinds).toContain('queue-hydrate');
    expect(kinds).toContain('add-by-rss-refresh');
  });

  it('registers the push device on start and sign-in but not on every foreground', () => {
    const kindsFor = (trigger: 'app-foreground' | 'app-start' | 'sign-in'): string[] =>
      planSyncRun({ isAuthenticated: true, trigger }).map((planned) => planned.kind);

    expect(kindsFor('app-start')).toContain('push-device-registration');
    expect(kindsFor('sign-in')).toContain('push-device-registration');
    expect(kindsFor('app-foreground')).not.toContain('push-device-registration');
  });

  it('marks a pull-to-refresh as user work so it overtakes an opportunistic pass', () => {
    const pulled = planSyncRun({ isAuthenticated: true, trigger: 'pull-to-refresh' });
    const foregrounded = planSyncRun({ isAuthenticated: true, trigger: 'app-foreground' });

    expect(pulled.every((planned) => planned.priority === 'user')).toBe(true);
    expect(foregrounded.every((planned) => planned.priority === 'background')).toBe(true);
  });

  it('plans only roots, leaving discovered work to the job that finds it', () => {
    const kinds = planSyncRun({ isAuthenticated: true, trigger: 'app-start' }).map(
      (planned) => planned.kind
    );

    expect(kinds).not.toContain('subscriptions-page');
    expect(kinds).not.toContain('subscriptions-commit');
    expect(kinds).not.toContain('channel-items');
    expect(kinds).not.toContain('add-by-rss-parse');
  });
});
