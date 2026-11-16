import type { DTOLegacyPodcastLookupAnswer } from '@podverse/helpers/dto';
import { LEGACY_PODCAST_LOOKUP_MAX_IDS } from '@podverse/helpers/dto';

import { requestWithoutMobileAuth } from '../../auth/authRequestWithRefresh';
import { addByRssRepository } from '../../data/repositories/addByRssRepository';
import { subscribedChannelFromLookup } from '../../data/repositories/subscriptionsMerge';
import { subscriptionsRepository } from '../../data/repositories/subscriptionsRepository';
import { syncEventLogRepository } from '../../data/repositories/syncEventLogRepository';
import type { V4CarryoverRow } from '../../data/repositories/v4CarryoverRepository';
import {
  V4_CARRYOVER_DONE_CODE,
  v4CarryoverRepository,
} from '../../data/repositories/v4CarryoverRepository';
import { v4DownloadCarryoverRepository } from '../../data/repositories/v4DownloadCarryoverRepository';
import { homeFeedRefresh } from '../../lib/home/homeFeedRefresh';
import { getOrCreateInstallationId } from '../../push/installationId';
import { requestAddByRssRefresh } from '../../sync/requestAddByRssRefresh';
import { requestLegacyLookup } from './legacyLookupRequest';
import { countV4CarryoverRows, planV4Carryover } from './planV4Carryover';

export type V4CarryoverRunDeps = {
  /** The next Add by RSS refresh may ask the directory match without waiting out the hour. */
  clearDirectoryMatchPacing: () => void;
  isSignedIn: () => boolean;
};

/** How long one lookup pass may spend waiting on a rate-limit delay before it stops. */
const LOOKUP_WAIT_BUDGET_MS = 15000;

/**
 * Waiting rows are retried once per process, once a signed-out run is about to apply them.
 * Pending rows keep scheduling the job. A signed-in skip does not consume the retry.
 */
let waitingRetriedThisSession = false;

let inFlight: Promise<void> | null = null;

/**
 * True when a signed-out phone still has staged rows to resolve.
 * Waiting rows count only until this process has loaded them once.
 */
export const shouldScheduleV4Carryover = async (signedOut: boolean): Promise<boolean> => {
  if (!signedOut) {
    return false;
  }
  if (!(await v4CarryoverRepository.isCopyAllowed())) {
    return false;
  }
  const pending = await v4CarryoverRepository.listByStatus(['pending']);
  if (pending.length > 0) {
    return true;
  }
  if (waitingRetriedThisSession) {
    return false;
  }
  const waiting = await v4CarryoverRepository.listByStatus(['waiting']);
  return waiting.length > 0;
};

const requestLookupChunk = async (
  podcastIds: readonly string[],
  installId: string,
  remainingMs: () => number
): Promise<DTOLegacyPodcastLookupAnswer[] | null> => {
  const result = await requestLegacyLookup(
    () =>
      requestWithoutMobileAuth((api) =>
        api.reqLegacyPodcastLookup({
          install_id: installId,
          podcast_ids: [...podcastIds],
        })
      ),
    remainingMs
  );
  if (result.kind === 'http') {
    return null;
  }
  return Array.isArray(result.value.answers) ? result.value.answers : null;
};

const loadPodcastAnswers = async (
  podcastIds: readonly string[]
): Promise<{ answers: Map<string, DTOLegacyPodcastLookupAnswer>; complete: boolean }> => {
  const answers = new Map<string, DTOLegacyPodcastLookupAnswer>();
  const installId = await getOrCreateInstallationId();
  const startedAt = Date.now();
  const remainingMs = (): number => LOOKUP_WAIT_BUDGET_MS - (Date.now() - startedAt);

  for (let offset = 0; offset < podcastIds.length; offset += LEGACY_PODCAST_LOOKUP_MAX_IDS) {
    const chunk = podcastIds.slice(offset, offset + LEGACY_PODCAST_LOOKUP_MAX_IDS);
    const chunkAnswers = await requestLookupChunk(chunk, installId, remainingMs);
    if (chunkAnswers === null) {
      return { answers, complete: false };
    }
    for (const answer of chunkAnswers) {
      answers.set(answer.podcast_id, answer);
    }
  }

  return { answers, complete: true };
};

const applyPlan = async (
  rows: readonly V4CarryoverRow[],
  answers: ReadonlyMap<string, DTOLegacyPodcastLookupAnswer>,
  lookupComplete: boolean,
  deps: V4CarryoverRunDeps
): Promise<void> => {
  const plannedEntries = lookupComplete
    ? rows
    : rows.filter((row) => row.legacyKind === 'add_by_rss' || answers.has(row.legacyId));
  const plan = planV4Carryover(plannedEntries, answers);
  let subscribed = false;
  let wroteStub = false;

  for (const action of plan.actions) {
    if (action.kind === 'subscribe') {
      const channel = subscribedChannelFromLookup(action.channel);
      if (channel !== null) {
        await subscriptionsRepository.subscribeLocal(channel);
        subscribed = true;
      }
      continue;
    }
    const wrote = await addByRssRepository.addSignedOutFeedStub({
      feedUrl: action.feedUrl,
      title: action.title,
    });
    if (wrote) {
      wroteStub = true;
    }
  }

  for (const row of plan.rows) {
    if (row.status === null) {
      await v4CarryoverRepository.bumpAttempts(row.legacyKind, row.legacyId);
    } else {
      await v4CarryoverRepository.setStatus(row.legacyKind, row.legacyId, row.status);
    }
  }

  if (wroteStub) {
    deps.clearDirectoryMatchPacing();
    if ((await v4DownloadCarryoverRepository.listByStatus(['pending'])).length === 0) {
      requestAddByRssRefresh();
    }
  }

  if (lookupComplete) {
    const counts = countV4CarryoverRows(plan.rows);
    await syncEventLogRepository.append({
      details: {
        add_by_rss: String(counts.addByRss),
        blocked: String(counts.blocked),
        subscribed: String(counts.subscribed),
        waiting: String(counts.waiting),
      },
      errorCode: V4_CARRYOVER_DONE_CODE,
      jobKind: 'v4-carryover',
      message: null,
      occurredAt: Date.now(),
      outcome: 'reconciled',
    });
  }

  if (subscribed || wroteStub) {
    homeFeedRefresh.notify();
  }
};

const executeV4Carryover = async (deps: V4CarryoverRunDeps): Promise<void> => {
  if (deps.isSignedIn()) {
    return;
  }

  const includeWaiting = !waitingRetriedThisSession;
  const rows = await v4CarryoverRepository.listByStatus(
    includeWaiting ? ['pending', 'waiting'] : ['pending']
  );
  if (rows.length === 0 || deps.isSignedIn()) {
    return;
  }

  const podcastIds = rows.filter((row) => row.legacyKind === 'podcast').map((row) => row.legacyId);
  const loaded =
    podcastIds.length === 0
      ? { answers: new Map<string, DTOLegacyPodcastLookupAnswer>(), complete: true }
      : await loadPodcastAnswers(podcastIds);

  if (deps.isSignedIn()) {
    return;
  }
  if (rows.some((row) => row.status === 'waiting')) {
    waitingRetriedThisSession = true;
  }

  await applyPlan(rows, loaded.answers, loaded.complete, deps);
};

/** Resolves staged rows into local subscriptions and Add by RSS follows. Overlapping runs share one pass. */
export const runV4Carryover = (deps: V4CarryoverRunDeps): Promise<void> => {
  if (inFlight !== null) {
    return inFlight;
  }
  const run = executeV4Carryover(deps).finally(() => {
    inFlight = null;
  });
  inFlight = run;
  return run;
};
