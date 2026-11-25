import { useCallback, useRef } from 'react';

import type { PlaybackEventKind } from '@podverse/helpers';
import type { DTOQueueResource, QueueExtraParams } from '@podverse/helpers/dto';
import type {
  LocalQueueLists,
  PlaybackTarget,
  QueueZoneWrite,
  QueueZoneWriteQueue,
} from '@podverse/playback-core';
import {
  emptyQueueZoneWriteQueue,
  enqueueNextLeave,
  enqueuePreviousRestore,
  noteQueueZoneWritePosted,
  queueResourceContentId,
  stepLocalQueueNext,
  stepLocalQueuePrevious,
} from '@podverse/playback-core';

import { useAuth } from '../auth/AuthProvider';
import { useQueues } from '../contexts/QueuesProvider';
import type { MobileAuthRequestContext } from '../data';
import { queueRepository } from '../data';

/** How long the head must sit still before its audio load and now-playing post run. */
export const OPTIMISTIC_QUEUE_HEAD_IDLE_MS = 50;

type LeaveRow = {
  id: string;
  resource: DTOQueueResource;
};

type HistoryMeta = {
  completed: boolean;
  eventKind: PlaybackEventKind;
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
};

export type OptimisticQueueHistoryInput = {
  completed: boolean;
  playbackPosition: string;
};

export type OptimisticQueueNextResult =
  | { kind: 'advanced'; resource: DTOQueueResource; engineLeft: boolean }
  | { kind: 'settled' }
  | { kind: 'unavailable' };

const emptyLists = (): LocalQueueLists<LeaveRow> => ({
  history: [],
  queue: [],
  leaveStack: [],
});

const emptySession = (): LeaveSession => ({
  queueIdText: null,
  lists: emptyLists(),
  writes: emptyQueueZoneWriteQueue(),
  dirty: false,
  historyMeta: new Map(),
  npIdle: false,
});

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

/** The id a queue row uses for the item, clip, or soundbite now playing. */
export const playbackTargetContentId = (target: PlaybackTarget): string | null => {
  switch (target.kind) {
    case 'clip':
      return target.clip.id_text;
    case 'soundbite':
      return target.soundbite.id_text;
    case 'add-by-rss':
      return null;
    case 'livestream':
      return target.item?.id_text ?? null;
    case 'chapter':
    case 'item-podcast':
    case 'item-video':
    case 'item-music':
      return target.item.id_text;
  }
};

const nextSendable = (session: LeaveSession): QueueZoneWrite | null => {
  const head = session.writes.writes[0];
  if (head === undefined) {
    return null;
  }
  if (head.type === 'now-playing' && !session.npIdle) {
    return null;
  }
  return head;
};

const findRow = (session: LeaveSession, id: string): LeaveRow | undefined =>
  session.lists.queue.find((row) => row.id === id) ??
  session.lists.history.find((row) => row.id === id);

const dropWrite = (queue: QueueZoneWriteQueue, write: QueueZoneWrite): QueueZoneWriteQueue => {
  const head = queue.writes[0];
  if (head === undefined || head.type !== write.type || head.id !== write.id) {
    return queue;
  }
  return { ...queue, writes: queue.writes.slice(1) };
};

const paramsForWrite = (write: QueueZoneWrite, meta: HistoryMeta | undefined): QueueExtraParams => {
  if (write.type !== 'history' || meta === undefined) {
    return {};
  }
  return {
    completed: meta.completed,
    last_played_at: meta.lastPlayedAt,
    playback_event_kind: meta.eventKind,
    playback_position: meta.playbackPosition,
  };
};

/**
 * Applies Next and Previous to the in-memory queue immediately and posts the zone
 * changes one at a time. Now playing is posted only after the head stops changing.
 */
export function useOptimisticQueueLeave(): {
  tryNext: (playingId: string, history: OptimisticQueueHistoryInput) => OptimisticQueueNextResult;
  tryPrevious: () => DTOQueueResource | null;
} {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { activeQueue, activeQueueUpcomingResources, setActiveQueueUpcomingResources } =
    useQueues();
  const sessionRef = useRef<LeaveSession>(emptySession());
  const resourcesRef = useRef(activeQueueUpcomingResources);
  resourcesRef.current = activeQueueUpcomingResources;
  const queueIdRef = useRef(activeQueue?.id_text ?? null);
  queueIdRef.current = activeQueue?.id_text ?? null;
  const statusRef = useRef(status);
  statusRef.current = status;
  const contextRef = useRef<MobileAuthRequestContext>({
    accessToken,
    clearSession,
    refreshToken,
    setTokens,
  });
  contextRef.current = { accessToken, clearSession, refreshToken, setTokens };
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const drainRunningRef = useRef(false);

  const publishLists = useCallback(
    (session: LeaveSession) => {
      const resources = session.lists.queue.map((row) => row.resource);
      setActiveQueueUpcomingResources(resources);
      const queueIdText = session.queueIdText;
      if (queueIdText === null) {
        return;
      }
      void queueRepository.applyLocalQueueOrder(queueIdText, {
        nowPlaying: resources[0] ?? null,
        upcoming: resources.slice(1),
        historyNewestFirst: session.lists.history.map((row) => row.resource),
      });
    },
    [setActiveQueueUpcomingResources]
  );

  const drain = useCallback(async () => {
    if (drainRunningRef.current) {
      return;
    }
    drainRunningRef.current = true;
    try {
      for (;;) {
        const session = sessionRef.current;
        const write = nextSendable(session);
        if (
          write === null ||
          session.queueIdText === null ||
          statusRef.current !== 'authenticated'
        ) {
          break;
        }
        const resource = findRow(session, write.id)?.resource;
        if (resource === undefined) {
          session.writes = dropWrite(session.writes, write);
          continue;
        }
        try {
          await queueRepository.postQueueResourceZone(
            contextRef.current,
            session.queueIdText,
            write.type,
            resource,
            paramsForWrite(write, session.historyMeta.get(write.id))
          );
        } catch {
          break;
        }
        session.writes = noteQueueZoneWritePosted(session.writes, write);
      }
      if (sessionRef.current.writes.writes.length === 0) {
        sessionRef.current.dirty = false;
      }
    } finally {
      drainRunningRef.current = false;
      if (nextSendable(sessionRef.current) !== null) {
        void drain();
      }
    }
  }, []);

  const bumpIdle = useCallback(() => {
    sessionRef.current.npIdle = false;
    if (idleTimerRef.current !== null) {
      clearTimeout(idleTimerRef.current);
    }
    idleTimerRef.current = setTimeout(() => {
      idleTimerRef.current = null;
      sessionRef.current.npIdle = true;
      void drain();
    }, OPTIMISTIC_QUEUE_HEAD_IDLE_MS);
  }, [drain]);

  const alignQueue = useCallback((): LeaveSession | null => {
    const queueIdText = queueIdRef.current;
    let session = sessionRef.current;
    if (session.queueIdText !== queueIdText) {
      session = { ...emptySession(), queueIdText };
      sessionRef.current = session;
    }
    if (session.dirty) {
      return session;
    }
    const rows = rowsFromResources(resourcesRef.current);
    if (rows === null) {
      return null;
    }
    session.lists = { ...session.lists, queue: rows };
    session.queueIdText = queueIdText;
    return session;
  }, []);

  const tryNext = useCallback(
    (playingId: string, history: OptimisticQueueHistoryInput): OptimisticQueueNextResult => {
      const session = alignQueue();
      if (session === null) {
        return { kind: 'unavailable' };
      }
      const localHeadId = session.lists.queue[0]?.id;
      const stepId = session.dirty && localHeadId !== undefined ? localHeadId : playingId;
      const step = stepLocalQueueNext(session.lists, stepId);
      if (step.kind === 'none' && session.dirty) {
        return { kind: 'settled' };
      }
      if (step.kind !== 'advance') {
        return { kind: 'unavailable' };
      }
      const engineIsOnLeft = step.left.id === playingId;
      session.lists = step.lists;
      session.dirty = true;
      session.writes = enqueueNextLeave(session.writes, step.left.id, step.next.id);
      session.historyMeta.set(step.left.id, {
        completed: engineIsOnLeft ? history.completed : false,
        eventKind: engineIsOnLeft && history.completed ? 'complete' : 'skip',
        lastPlayedAt: new Date().toISOString(),
        playbackPosition: engineIsOnLeft && !history.completed ? history.playbackPosition : '0',
      });
      publishLists(session);
      bumpIdle();
      void drain();
      return { kind: 'advanced', engineLeft: engineIsOnLeft, resource: step.next.resource };
    },
    [alignQueue, bumpIdle, drain, publishLists]
  );

  const tryPrevious = useCallback((): DTOQueueResource | null => {
    const session = alignQueue();
    if (session === null) {
      return null;
    }
    const step = stepLocalQueuePrevious(session.lists);
    if (step.kind !== 'advance') {
      return null;
    }
    session.lists = step.lists;
    session.dirty = true;
    session.writes = enqueuePreviousRestore(session.writes, step.demoted.id, step.restored.id);
    publishLists(session);
    bumpIdle();
    void drain();
    return step.restored.resource;
  }, [alignQueue, bumpIdle, drain, publishLists]);

  return { tryNext, tryPrevious };
}
