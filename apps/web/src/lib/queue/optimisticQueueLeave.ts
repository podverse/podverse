import type { QueueExtraParams } from '@podverse/helpers';
import type { DTOQueueResource } from '@podverse/helpers/dto';
import {
  emptyQueueZoneWriteQueue,
  enqueueNextLeave,
  enqueuePreviousRestore,
  type LocalQueueLists,
  noteQueueZoneWritePosted,
  queueResourceContentId,
  type QueueZoneWrite,
  type QueueZoneWriteQueue,
  stepLocalQueueNext,
  stepLocalQueuePrevious,
} from '@podverse/playback-core';

import { getApiRequestService } from '../../factories/apiRequestService';

/** How long the head must sit still before its now-playing post is sent. */
const NOW_PLAYING_POST_IDLE_MS = 50;

type LeaveRow = {
  id: string;
  resource: DTOQueueResource;
};

type HistoryMeta = {
  completed: boolean;
  eventKind: 'skip' | 'complete';
  lastPlayedAt: string;
  playbackPosition: string;
};

type LeaveSession = {
  queueIdText: string | null;
  lists: LocalQueueLists<LeaveRow>;
  writes: QueueZoneWriteQueue;
  dirty: boolean;
  historyMeta: Map<string, HistoryMeta>;
  npIdle: boolean;
  idleTimer: ReturnType<typeof setTimeout> | null;
};

export type OptimisticQueueLeaveBindings = {
  getQueueId: () => string | null;
  getResources: () => readonly DTOQueueResource[];
  setResources: (resources: DTOQueueResource[]) => void;
  loadResource: (resource: DTOQueueResource, shouldPlay: boolean) => Promise<void>;
};

export type OptimisticQueueStepResult = 'started' | 'settled' | 'unavailable';

let bindings: OptimisticQueueLeaveBindings | null = null;
let pendingLoads = 0;
let pendingLoad: { resource: DTOQueueResource; shouldPlay: boolean } | null = null;
let loadTimer: ReturnType<typeof setTimeout> | null = null;
let loadTicket = 0;
let drainChain: Promise<void> = Promise.resolve();

const emptySession = (): LeaveSession => ({
  queueIdText: null,
  lists: { history: [], queue: [], leaveStack: [] },
  writes: emptyQueueZoneWriteQueue(),
  dirty: false,
  historyMeta: new Map(),
  npIdle: false,
  idleTimer: null,
});

let session: LeaveSession = emptySession();

/** True while a skip has moved the local head and its audio load has not finished. */
export const isOptimisticQueueHeadPending = (): boolean => pendingLoads > 0;

export const bindOptimisticQueueLeave = (next: OptimisticQueueLeaveBindings): void => {
  bindings = next;
};

const toLeaveRow = (resource: DTOQueueResource): LeaveRow | null => {
  const id = queueResourceContentId(resource);
  if (id === null || id.length === 0) {
    return null;
  }
  return { id, resource };
};

const rowsFromResources = (resources: readonly DTOQueueResource[]): LeaveRow[] | null => {
  const rows: LeaveRow[] = [];
  for (const resource of resources) {
    const row = toLeaveRow(resource);
    if (row === null) {
      return null;
    }
    rows.push(row);
  }
  return rows;
};

const alignQueue = (): LeaveSession | null => {
  if (bindings === null) {
    return null;
  }
  const queueIdText = bindings.getQueueId();
  if (session.queueIdText !== queueIdText) {
    session = { ...emptySession(), queueIdText };
  }
  if (!session.dirty) {
    const rows = rowsFromResources(bindings.getResources());
    if (rows === null) {
      return null;
    }
    session.lists = { ...session.lists, queue: rows };
    session.queueIdText = queueIdText;
  }
  return session;
};

const publishLists = (): void => {
  if (bindings === null) {
    return;
  }
  bindings.setResources(session.lists.queue.map((row) => row.resource));
};

const nextSendable = (): QueueZoneWrite | null => {
  const head = session.writes.writes[0];
  if (head === undefined) {
    return null;
  }
  if (head.type === 'now-playing' && !session.npIdle) {
    return null;
  }
  return head;
};

const findRow = (id: string): LeaveRow | undefined =>
  session.lists.queue.find((row) => row.id === id) ??
  session.lists.history.find((row) => row.id === id);

const paramsForWrite = (write: QueueZoneWrite): QueueExtraParams => {
  if (write.type !== 'history') {
    return {};
  }
  const meta = session.historyMeta.get(write.id);
  if (meta === undefined) {
    return {};
  }
  return {
    completed: meta.completed,
    last_played_at: meta.lastPlayedAt,
    playback_event_kind: meta.eventKind,
    playback_position: meta.playbackPosition,
  };
};

const postZone = async (queueIdText: string, write: QueueZoneWrite, resource: DTOQueueResource) => {
  const api = getApiRequestService();
  const params = paramsForWrite(write);
  const clipId = resource.clip?.id_text;
  const soundbiteId = resource.item_soundbite?.id_text;
  const itemId = resource.item?.id_text;
  const addByRss = resource.add_by_rss_resource_data;
  if (typeof clipId === 'string' && clipId.length > 0) {
    if (write.type === 'history') {
      await api.reqQueueResourceClipAddHistory(queueIdText, clipId, params);
      return;
    }
    if (write.type === 'now-playing') {
      await api.reqQueueResourceClipAddNowPlaying(queueIdText, clipId, params);
      return;
    }
    await api.reqQueueResourceClipAddNext(queueIdText, clipId);
    return;
  }
  if (typeof soundbiteId === 'string' && soundbiteId.length > 0) {
    if (write.type === 'history') {
      await api.reqQueueResourceItemSoundbiteAddHistory(queueIdText, soundbiteId, params);
      return;
    }
    if (write.type === 'now-playing') {
      await api.reqQueueResourceItemSoundbiteAddNowPlaying(queueIdText, soundbiteId, params);
      return;
    }
    await api.reqQueueResourceItemSoundbiteAddNext(queueIdText, soundbiteId);
    return;
  }
  if (
    (typeof itemId !== 'string' || itemId.length === 0) &&
    addByRss !== null &&
    addByRss !== undefined
  ) {
    const resourceData = addByRss;
    if (write.type === 'history') {
      await api.reqQueueResourceItemAddByRSSAddHistory(queueIdText, {
        ...params,
        add_by_rss_resource_data: resourceData,
      });
      return;
    }
    if (write.type === 'now-playing') {
      await api.reqQueueResourceItemAddByRSSAddNowPlaying(queueIdText, {
        ...params,
        add_by_rss_resource_data: resourceData,
      });
      return;
    }
    await api.reqQueueResourceItemAddByRSSAddNext(queueIdText, {
      add_by_rss_resource_data: resourceData,
    });
    return;
  }
  if (typeof itemId !== 'string' || itemId.length === 0) {
    return;
  }
  if (write.type === 'history') {
    await api.reqQueueResourceItemAddHistory(queueIdText, itemId, params);
    return;
  }
  if (write.type === 'now-playing') {
    await api.reqQueueResourceItemAddNowPlaying(queueIdText, itemId, params);
    return;
  }
  await api.reqQueueResourceItemAddNext(queueIdText, itemId);
};

const runDrain = async (): Promise<void> => {
  for (;;) {
    const write = nextSendable();
    if (write === null || session.queueIdText === null) {
      break;
    }
    const resource = findRow(write.id)?.resource;
    if (resource === undefined) {
      const head = session.writes.writes[0];
      if (head !== undefined && head.type === write.type && head.id === write.id) {
        session.writes = { ...session.writes, writes: session.writes.writes.slice(1) };
      }
      continue;
    }
    try {
      await postZone(session.queueIdText, write, resource);
    } catch {
      break;
    }
    session.writes = noteQueueZoneWritePosted(session.writes, write);
  }
  if (session.writes.writes.length === 0) {
    session.dirty = false;
  }
};

const kickDrain = (): Promise<void> => {
  drainChain = drainChain.then(runDrain).catch(() => undefined);
  return drainChain;
};

const bumpIdle = (): void => {
  session.npIdle = false;
  if (session.idleTimer !== null) {
    clearTimeout(session.idleTimer);
  }
  session.idleTimer = setTimeout(() => {
    session.idleTimer = null;
    session.npIdle = true;
    void kickDrain();
  }, NOW_PLAYING_POST_IDLE_MS);
};

const scheduleLoad = (resource: DTOQueueResource, shouldPlay: boolean): void => {
  pendingLoad = { resource, shouldPlay };
  pendingLoads = 1;
  const ticket = ++loadTicket;
  if (loadTimer !== null) {
    clearTimeout(loadTimer);
  }
  loadTimer = setTimeout(() => {
    loadTimer = null;
    const job = pendingLoad;
    pendingLoad = null;
    if (job === null || bindings === null) {
      if (ticket === loadTicket) {
        pendingLoads = 0;
      }
      return;
    }
    void bindings.loadResource(job.resource, job.shouldPlay).finally(() => {
      if (ticket === loadTicket) {
        pendingLoads = 0;
      }
    });
  }, NOW_PLAYING_POST_IDLE_MS);
};

const rememberHistory = (id: string, completed: boolean, playbackPosition: string): void => {
  session.historyMeta.set(id, {
    completed,
    eventKind: completed ? 'complete' : 'skip',
    lastPlayedAt: new Date().toISOString(),
    playbackPosition: completed ? '0' : playbackPosition,
  });
};

export const tryOptimisticQueueNext = (input: {
  playingId: string;
  completed: boolean;
  playbackPosition: string;
  shouldPlay: boolean;
}): OptimisticQueueStepResult => {
  const aligned = alignQueue();
  if (aligned === null) {
    return 'unavailable';
  }
  const localHeadId = aligned.lists.queue[0]?.id;
  const stepId = aligned.dirty && localHeadId !== undefined ? localHeadId : input.playingId;
  const step = stepLocalQueueNext(aligned.lists, stepId);
  if (step.kind === 'none' && aligned.dirty) {
    return 'settled';
  }
  if (step.kind !== 'advance') {
    return 'unavailable';
  }
  if (step.next.resource.add_by_rss_resource_data) {
    return aligned.dirty ? 'settled' : 'unavailable';
  }
  const engineIsOnLeft = step.left.id === input.playingId;
  session.lists = step.lists;
  session.dirty = true;
  session.writes = enqueueNextLeave(session.writes, step.left.id, step.next.id);
  rememberHistory(
    step.left.id,
    engineIsOnLeft ? input.completed : false,
    engineIsOnLeft && !input.completed ? input.playbackPosition : '0'
  );
  publishLists();
  bumpIdle();
  void kickDrain();
  scheduleLoad(step.next.resource, input.shouldPlay);
  return 'started';
};

export const tryOptimisticQueuePrevious = (input: {
  shouldPlay: boolean;
}): OptimisticQueueStepResult => {
  const aligned = alignQueue();
  if (aligned === null) {
    return 'unavailable';
  }
  const step = stepLocalQueuePrevious(aligned.lists);
  if (step.kind !== 'advance') {
    return 'unavailable';
  }
  if (step.restored.resource.add_by_rss_resource_data) {
    return aligned.dirty ? 'settled' : 'unavailable';
  }
  session.lists = step.lists;
  session.dirty = true;
  session.writes = enqueuePreviousRestore(session.writes, step.demoted.id, step.restored.id);
  publishLists();
  bumpIdle();
  void kickDrain();
  scheduleLoad(step.restored.resource, input.shouldPlay);
  return 'started';
};
