import { Queue } from '@orm/entities/queue/queue.js';
import { QueueResource } from '@orm/entities/queue/queueResource.js';
import { findOptionsRelationsFromPaths } from '@orm/lib/findOptionsRelationsFromPaths.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { QueueService } from '@orm/services/queue/queue.js';
import { Mutex } from 'async-mutex';
import type {
  DeepPartial,
  EntityManager,
  FindManyOptions,
  FindOperator,
  FindOptionsOrderValue,
  FindOptionsRelations,
  FindOptionsWhere,
} from 'typeorm';
import { Between, In, LessThan, LessThanOrEqual, MoreThan } from 'typeorm';

import type {
  DTOQueueResourceAbridgedResponseData,
  PlaybackEventKind,
  PlaybackZone,
  QueueExtraParams,
} from '@podverse/helpers';
import {
  clampClientPlaybackTimestamp,
  getAddByRSSHashId,
  mergePlaybackState,
  PLAYBACK_REPLAY_BATCH_LIMIT,
  resolveZoneForEvent,
  toEpochMsOrNull,
} from '@podverse/helpers';

import { ClipService } from '../clip.js';
import { ItemService } from '../item/item.js';
import { ItemSoundbiteService } from '../item/itemSoundbite.js';
import { applyResolvesToActiveItemOrAddByRss } from './queueResourceActiveItemFilter.js';
import {
  chunkIdsForInClause,
  mergeHistoryListOptions,
  QUEUE_IN_CLAUSE_MAX_IDS,
} from './queueResourceListGuardrails.js';

const QUEUE_LIST_POSITION_INCREMENT = 0.00000001;

const epsilon = 1e-21;

type QueueLinkedResourceKey = 'clip' | 'item' | 'item_soundbite';

type QueueLinkedResourceLookup = {
  getByIdText: (id_text: string) => Promise<{ id: string | number } | null>;
};

type QueueResourcePersistParams = {
  completed?: boolean;
  last_played_at?: Date | null;
  last_played_received_at?: Date | null;
  media_file_duration?: string;
  playback_position?: string;
};

type QueueResourcePlaybackZone = Exclude<PlaybackZone, 'removed'>;

export type QueuePlaybackReplayEvent = {
  add_by_rss_hash_id?: string;
  add_by_rss_resource_data?: object;
  clip_id_text?: string;
  completed?: boolean;
  item_id_text?: string;
  item_soundbite_id_text?: string;
  last_played_at?: string;
  media_file_duration?: string;
  playback_event_kind: PlaybackEventKind;
  playback_position?: string;
};

export type QueueResourceAbridgedRow = DTOQueueResourceAbridgedResponseData;

type QueueResourceAbridgedRawRow = {
  i: number | string;
  p: string | number | null;
  d: string | number | null;
  z: boolean | null;
  c: string | number | null;
  t: string | number | null;
  s: string | number | null;
  a: string | null;
};

function abridgedOptionalId(value: string | number | null): number | undefined {
  if (value === null || value === '') {
    return undefined;
  }
  if (typeof value === 'number') {
    return value;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function mapAbridgedRawRow(row: QueueResourceAbridgedRawRow): DTOQueueResourceAbridgedResponseData {
  const mapped: DTOQueueResourceAbridgedResponseData = {
    i: typeof row.i === 'number' ? row.i : Number(row.i),
    p: row.p === null || row.p === undefined ? '' : String(row.p),
    d: row.d === null || row.d === undefined ? '' : String(row.d),
  };
  if (row.z === true) {
    mapped.z = true;
  }
  const clipId = abridgedOptionalId(row.c);
  if (clipId !== undefined) {
    mapped.c = clipId;
  }
  const itemId = abridgedOptionalId(row.t);
  if (itemId !== undefined) {
    mapped.t = itemId;
  }
  const soundbiteId = abridgedOptionalId(row.s);
  if (soundbiteId !== undefined) {
    mapped.s = soundbiteId;
  }
  if (row.a !== null && row.a !== undefined && row.a !== '') {
    mapped.a = row.a;
  }
  return mapped;
}

type QueueResourceIdColumn = 'clip_id' | 'item_id' | 'item_soundbite_id';

const QUEUE_RESOURCE_ID_BY_KEY: Record<QueueLinkedResourceKey, QueueResourceIdColumn> = {
  clip: 'clip_id',
  item: 'item_id',
  item_soundbite: 'item_soundbite_id',
};

const listPositionLessThan = (value: number): FindOperator<string> => LessThan(String(value));

const listPositionLessThanOrEqual = (value: number): FindOperator<string> =>
  LessThanOrEqual(String(value));

const listPositionMoreThan = (value: number): FindOperator<string> => MoreThan(String(value));

const nowPlayingListPositionWhere = (): FindOperator<string> =>
  Between(String(-epsilon), String(epsilon));

const REPLAY_ADVISORY_LOCK_NAMESPACE = 743;

type QueueReplayLinkedResourceEvent = {
  event: QueuePlaybackReplayEvent;
  idText: string;
  resourceKey: QueueLinkedResourceKey;
  resourceService: QueueLinkedResourceLookup;
};

type QueueReplayAddByRssEvent = {
  addByRssHashId: string;
  addByRssResourceData?: object;
  event: QueuePlaybackReplayEvent;
};

type QueueReplayResourceEvent = QueueReplayLinkedResourceEvent | QueueReplayAddByRssEvent;

function parseMediaPlayerTime(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') {
    return null;
  }
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function toIsoOrNull(value: Date | string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const parsed = Date.parse(value);
  if (Number.isNaN(parsed)) {
    return null;
  }
  return new Date(parsed).toISOString();
}

function resolveQueueZoneFromListPosition(list_position: string): QueueResourcePlaybackZone {
  const position = parseMediaPlayerTime(list_position);
  if (position === null) {
    return 'history';
  }
  if (position > 0) {
    return 'upcoming';
  }
  if (position >= -epsilon && position <= epsilon) {
    return 'now_playing';
  }
  return 'history';
}

function resolveFallbackPlaybackZoneForEvent(kind: PlaybackEventKind): QueueResourcePlaybackZone {
  const zone = resolveZoneForEvent(kind);
  if (zone === 'history') {
    return 'history';
  }
  if (zone === 'upcoming') {
    return 'upcoming';
  }
  return 'now_playing';
}

function queueResourceIdColumn(resourceKey: QueueLinkedResourceKey): QueueResourceIdColumn {
  return QUEUE_RESOURCE_ID_BY_KEY[resourceKey];
}

function queueResourceWhereByLinkedId(
  queueId: number,
  resourceKey: QueueLinkedResourceKey,
  resourceId: string
): FindOptionsWhere<QueueResource> {
  if (resourceKey === 'clip') {
    return { queue: { id: queueId }, clip_id: resourceId };
  }
  if (resourceKey === 'item') {
    return { queue: { id: queueId }, item_id: resourceId };
  }
  return { queue: { id: queueId }, item_soundbite_id: resourceId };
}

function queueResourceDeleteWhere(
  resourceKey: QueueLinkedResourceKey,
  resourceId: string
): Record<string, string> {
  return { [queueResourceIdColumn(resourceKey)]: resourceId };
}

function queueResourceCreatePartial(
  queue: Queue,
  resourceKey: QueueLinkedResourceKey,
  resourceId: string,
  list_position: string,
  params: QueueResourcePersistParams = {}
): DeepPartial<QueueResource> {
  const base: DeepPartial<QueueResource> = { queue, list_position };
  if (params.playback_position !== undefined) {
    base.playback_position = params.playback_position;
  }
  if (params.media_file_duration !== undefined) {
    base.media_file_duration = params.media_file_duration;
  }
  if (params.completed !== undefined) {
    base.completed = params.completed;
  }
  if (params.last_played_at !== undefined) {
    base.last_played_at = params.last_played_at;
  }
  if (params.last_played_received_at !== undefined) {
    base.last_played_received_at = params.last_played_received_at;
  }
  if (resourceKey === 'clip') {
    return { ...base, clip_id: resourceId };
  }
  if (resourceKey === 'item') {
    return { ...base, item_id: resourceId };
  }
  return { ...base, item_soundbite_id: resourceId };
}

export const listResourceRelations: FindOptionsRelations<QueueResource> =
  findOptionsRelationsFromPaths([
    'clip',
    'clip.item',
    'clip.item.item_about',
    'clip.item.item_enclosures',
    'clip.item.item_enclosures.item_enclosure_sources',
    'clip.item.item_images',
    'clip.item.channel',
    'clip.item.channel.channel_images',
    'clip.sharable_status',
    'clip.account',
    'item',
    'item.item_about',
    'item.item_enclosures',
    'item.item_enclosures.item_enclosure_sources',
    'item.item_images',
    'item.channel',
    'item.channel.channel_images',
    'item_soundbite',
    'item_soundbite.item',
    'item_soundbite.item.item_about',
    'item_soundbite.item.item_enclosures',
    'item_soundbite.item.item_enclosures.item_enclosure_sources',
    'item_soundbite.item.item_images',
    'item_soundbite.item.channel',
    'item_soundbite.item.channel.channel_images',
  ]);

export class QueueResourceService extends BaseManyService<QueueResource, 'queue'> {
  private queueService: QueueService;
  private clipService: ClipService;
  private itemService: ItemService;
  private itemSoundbiteService: ItemSoundbiteService;

  private static queueLocks: Map<string, Mutex> = new Map();

  private getQueueLock(queue_id_text: string): Mutex {
    let lock = QueueResourceService.queueLocks.get(queue_id_text);
    if (!lock) {
      lock = new Mutex();
      QueueResourceService.queueLocks.set(queue_id_text, lock);
    }
    return lock;
  }

  constructor(transactionalEntityManager?: EntityManager) {
    super(QueueResource, 'queue', transactionalEntityManager);
    this.queueService = new QueueService(transactionalEntityManager);
    this.clipService = new ClipService(transactionalEntityManager);
    this.itemService = new ItemService();
    this.itemSoundbiteService = new ItemSoundbiteService();
  }

  private buildPlaybackWriteParams(
    existing: QueueResource | null,
    params: QueueExtraParams,
    fallbackZone: QueueResourcePlaybackZone,
    receivedAtIso: string
  ): {
    isStale: boolean;
    persist: QueueResourcePersistParams;
    zone: PlaybackZone;
  } {
    const clampedLastPlayedAt = clampClientPlaybackTimestamp(params.last_played_at, receivedAtIso);
    const existingLastPlayedAt = toIsoOrNull(existing?.last_played_at ?? null);
    const existingLastPlayedAtMs = toEpochMsOrNull(existingLastPlayedAt);
    const incomingLastPlayedAtMs = toEpochMsOrNull(clampedLastPlayedAt);

    if (
      existingLastPlayedAtMs !== null &&
      incomingLastPlayedAtMs !== null &&
      incomingLastPlayedAtMs < existingLastPlayedAtMs
    ) {
      const staleZone = existing
        ? resolveQueueZoneFromListPosition(existing.list_position)
        : fallbackZone;
      return { isStale: true, persist: {}, zone: staleZone };
    }

    const existingPlaybackPosition = parseMediaPlayerTime(existing?.playback_position) ?? 0;
    const incomingPlaybackPosition = parseMediaPlayerTime(params.playback_position);
    const incomingZone = params.playback_event_kind
      ? resolveZoneForEvent(params.playback_event_kind)
      : fallbackZone;

    const merged = mergePlaybackState(
      {
        completed: existing?.completed === true,
        lastPlayedAt: existingLastPlayedAt,
        playbackPosition: existingPlaybackPosition,
        zone: existing ? resolveQueueZoneFromListPosition(existing.list_position) : fallbackZone,
      },
      {
        completed: params.completed === true,
        lastPlayedAt: clampedLastPlayedAt,
        playbackPosition: incomingPlaybackPosition ?? existingPlaybackPosition,
        zone: incomingZone,
      }
    );

    const persist: QueueResourcePersistParams = {
      completed: merged.completed,
      last_played_at: merged.lastPlayedAt ? new Date(merged.lastPlayedAt) : null,
      last_played_received_at: new Date(receivedAtIso),
      playback_position: String(merged.playbackPosition),
    };

    if (params.media_file_duration !== undefined && params.media_file_duration !== null) {
      persist.media_file_duration = String(params.media_file_duration);
    }

    return { isStale: false, persist, zone: merged.zone };
  }

  private async nextHistoryListPositionTransactional(
    manager: EntityManager,
    queueId: number
  ): Promise<string> {
    const mostRecentHistoryItem = await manager.findOne(QueueResource, {
      where: { queue: { id: queueId }, list_position: listPositionLessThan(0) },
      order: { list_position: 'DESC' },
    });
    const newPosition = mostRecentHistoryItem
      ? parseFloat(mostRecentHistoryItem.list_position) + QUEUE_LIST_POSITION_INCREMENT
      : -1;
    return String(newPosition);
  }

  private async nextUpcomingListPositionTransactional(
    manager: EntityManager,
    queueId: number
  ): Promise<string> {
    const lastQueued = await manager.findOne(QueueResource, {
      where: { queue: { id: queueId }, list_position: listPositionMoreThan(0) },
      order: { list_position: 'DESC' },
    });
    if (!lastQueued) {
      return '1';
    }
    return String(parseFloat(lastQueued.list_position) + QUEUE_LIST_POSITION_INCREMENT);
  }

  private async applyLinkedPlaybackWriteTransactional(
    manager: EntityManager,
    queue_id_text: string,
    queue: Queue,
    resourceKey: QueueLinkedResourceKey,
    resourceId: string,
    params: QueueExtraParams,
    fallbackZone: QueueResourcePlaybackZone,
    receivedAtIso?: string
  ): Promise<QueueResource | null> {
    let queueResource = await manager.findOne(QueueResource, {
      where: queueResourceWhereByLinkedId(queue.id, resourceKey, resourceId),
    });
    const receiptIso = receivedAtIso ?? new Date().toISOString();
    const write = this.buildPlaybackWriteParams(queueResource, params, fallbackZone, receiptIso);

    if (write.isStale) {
      return queueResource;
    }

    if (write.zone === 'removed') {
      if (!queueResource) {
        return null;
      }
      await manager.delete(QueueResource, { id: queueResource.id });
      return queueResource;
    }

    let list_position: string;
    if (write.zone === 'history') {
      list_position = await this.nextHistoryListPositionTransactional(manager, queue.id);
    } else if (write.zone === 'upcoming') {
      const existingUpcoming = queueResource;
      const existingUpcomingPosition =
        existingUpcoming === null ? null : parseMediaPlayerTime(existingUpcoming.list_position);
      if (existingUpcoming === null || existingUpcomingPosition === null) {
        list_position = await this.nextUpcomingListPositionTransactional(manager, queue.id);
      } else {
        list_position =
          existingUpcomingPosition > 0
            ? existingUpcoming.list_position
            : await this.nextUpcomingListPositionTransactional(manager, queue.id);
      }
    } else {
      const existingNowPlaying = await manager.findOne(QueueResource, {
        where: { queue: { id: queue.id }, list_position: nowPlayingListPositionWhere() },
      });
      if (existingNowPlaying && existingNowPlaying.id !== queueResource?.id) {
        await this.moveQueueResourceToHistoryByIdTransactional(
          manager,
          queue_id_text,
          existingNowPlaying.id
        );
      }
      list_position = '0';
    }

    const nextPartial = queueResourceCreatePartial(
      queue,
      resourceKey,
      resourceId,
      list_position,
      write.persist
    );

    if (!queueResource) {
      queueResource = manager.create(QueueResource, nextPartial);
    } else {
      Object.assign(queueResource, nextPartial);
    }

    return manager.save(queueResource);
  }

  private async applyAddByRssPlaybackWriteTransactional(
    manager: EntityManager,
    queue_id_text: string,
    queue: Queue,
    addByRssHashId: string,
    addByRssResourceData: object | undefined,
    params: QueueExtraParams,
    fallbackZone: QueueResourcePlaybackZone,
    receivedAtIso?: string
  ): Promise<QueueResource | null> {
    let queueResource = await manager.findOne(QueueResource, {
      where: { queue: { id: queue.id }, add_by_rss_hash_id: addByRssHashId },
    });
    const receiptIso = receivedAtIso ?? new Date().toISOString();
    const write = this.buildPlaybackWriteParams(queueResource, params, fallbackZone, receiptIso);

    if (write.isStale) {
      return queueResource;
    }

    if (write.zone === 'removed') {
      if (!queueResource) {
        return null;
      }
      await manager.delete(QueueResource, { id: queueResource.id });
      return queueResource;
    }

    let list_position: string;
    if (write.zone === 'history') {
      list_position = await this.nextHistoryListPositionTransactional(manager, queue.id);
    } else if (write.zone === 'upcoming') {
      list_position = await this.nextUpcomingListPositionTransactional(manager, queue.id);
    } else {
      const existingNowPlaying = await manager.findOne(QueueResource, {
        where: { queue: { id: queue.id }, list_position: nowPlayingListPositionWhere() },
      });
      if (existingNowPlaying && existingNowPlaying.id !== queueResource?.id) {
        await this.moveQueueResourceToHistoryByIdTransactional(
          manager,
          queue_id_text,
          existingNowPlaying.id
        );
      }
      list_position = '0';
    }

    const resourceData = addByRssResourceData ?? queueResource?.add_by_rss_resource_data;
    if (!resourceData) {
      throw new Error('add_by_rss_resource_data is required when creating replay rows.');
    }

    const nextPartial = {
      add_by_rss_hash_id: addByRssHashId,
      add_by_rss_resource_data: resourceData,
      ...write.persist,
      list_position,
      queue,
    };

    if (!queueResource) {
      queueResource = manager.create(QueueResource, nextPartial);
    } else {
      Object.assign(queueResource, nextPartial);
    }

    return manager.save(queueResource);
  }

  private getReplayResourceEvent(event: QueuePlaybackReplayEvent): QueueReplayResourceEvent {
    const linkedCandidates: QueueReplayLinkedResourceEvent[] = [];

    if (event.clip_id_text) {
      linkedCandidates.push({
        event,
        idText: event.clip_id_text,
        resourceKey: 'clip',
        resourceService: this.clipService,
      });
    }
    if (event.item_id_text) {
      linkedCandidates.push({
        event,
        idText: event.item_id_text,
        resourceKey: 'item',
        resourceService: this.itemService,
      });
    }
    if (event.item_soundbite_id_text) {
      linkedCandidates.push({
        event,
        idText: event.item_soundbite_id_text,
        resourceKey: 'item_soundbite',
        resourceService: this.itemSoundbiteService,
      });
    }

    const addByRssHashId =
      event.add_by_rss_hash_id ??
      (event.add_by_rss_resource_data ? getAddByRSSHashId(event.add_by_rss_resource_data) : null);
    const hasAddByRss = addByRssHashId !== null;

    const sourceCount = linkedCandidates.length + (hasAddByRss ? 1 : 0);
    if (sourceCount !== 1) {
      throw new Error('Each replay event must reference exactly one queue resource.');
    }

    if (hasAddByRss) {
      return {
        addByRssHashId,
        addByRssResourceData: event.add_by_rss_resource_data,
        event,
      };
    }

    const selected = linkedCandidates[0];
    if (!selected) {
      throw new Error('Replay event is missing a linked resource reference.');
    }
    return selected;
  }

  private async findQueueResourcesByIdListOrdered(
    ids: number[],
    relations: FindManyOptions<QueueResource>['relations'] = listResourceRelations
  ): Promise<QueueResource[]> {
    if (ids.length === 0) {
      return [];
    }
    const rel = relations ?? listResourceRelations;
    const rows = await this.repositoryRead.find({
      where: { id: In(ids) },
      relations: rel,
    });
    const byId = new Map<number, QueueResource>(rows.map((r) => [r.id, r]));
    return ids.map((id) => byId.get(id)).filter((r): r is QueueResource => r !== undefined);
  }

  async getAllByAccountAbridged(account_id: number): Promise<QueueResourceAbridgedRow[]> {
    const queues = await this.queueService.getAllPrivate(account_id);
    if (!queues.length) {
      throw new Error('No queues found for account.');
    }
    const queueIds = queues.map((q) => q.id);
    const idChunks = chunkIdsForInClause(queueIds, QUEUE_IN_CLAUSE_MAX_IDS);

    const merged: QueueResourceAbridgedRow[] = [];
    for (const ids of idChunks) {
      const abridgedQb = this.repositoryRead
        .createQueryBuilder('qr')
        .select([
          'qr.id AS i',
          'qr.playback_position AS p',
          'qr.media_file_duration AS d',
          'qr.completed AS z',
          'qr.clip_id AS c',
          'qr.item_id AS t',
          'qr.item_soundbite_id AS s',
          'qr.add_by_rss_hash_id AS a',
        ])
        .where('qr.queue_id IN (:...queueIds)', { queueIds: ids });
      applyResolvesToActiveItemOrAddByRss('qr', abridgedQb);
      const rows = await abridgedQb
        .orderBy('qr.list_position', 'ASC')
        .getRawMany<QueueResourceAbridgedRawRow>();
      merged.push(...rows.map(mapAbridgedRawRow));
    }

    return merged;
  }

  async getNowPlayingByQueueIdText(queue_id_text: string): Promise<QueueResource | null> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const idQb = this.repositoryRead
      .createQueryBuilder('qr')
      .where('qr.queue_id = :qid', { qid: queue.id })
      .andWhere('qr.list_position BETWEEN :minP AND :maxP', { minP: -epsilon, maxP: epsilon });
    applyResolvesToActiveItemOrAddByRss('qr', idQb);
    const hit = await idQb.orderBy('qr.list_position', 'ASC').getOne();
    if (!hit) {
      return null;
    }
    const loaded = await this.findQueueResourcesByIdListOrdered([hit.id]);
    const firstRow = loaded[0] ?? null;
    if (!firstRow) {
      return null;
    }
    if (parseFloat(firstRow.list_position) === 0) {
      return firstRow;
    } else {
      firstRow.list_position = '0';
      await this.repositoryReadWrite.save(firstRow);
      return firstRow;
    }
  }

  /**
   * Place the first upcoming row at now-playing (`list_position` 0) when the queue has no
   * now-playing row. Leaves `last_played_at`, playback position, and completed alone — this is a
   * position move so an empty player can adopt the queue head without recording a listen.
   */
  async promoteFirstUpcomingToNowPlaying(queue_id_text: string): Promise<QueueResource | null> {
    const lock = this.getQueueLock(queue_id_text);
    return lock.runExclusive(async () => {
      const resourceId = await this.repositoryReadWrite.manager.transaction(async (manager) => {
        const queue = await manager.findOne(Queue, { where: { id_text: queue_id_text } });
        if (!queue) {
          throw new Error('Queue not found.');
        }

        const existingNowPlaying = await manager.findOne(QueueResource, {
          where: { queue: { id: queue.id }, list_position: nowPlayingListPositionWhere() },
        });
        if (existingNowPlaying) {
          return existingNowPlaying.id;
        }

        const firstUpcomingIdQb = manager
          .getRepository(QueueResource)
          .createQueryBuilder('qr')
          .where('qr.queue_id = :qid', { qid: queue.id })
          .andWhere('qr.list_position > 0');
        applyResolvesToActiveItemOrAddByRss('qr', firstUpcomingIdQb);
        const firstUpcoming = await firstUpcomingIdQb.orderBy('qr.list_position', 'ASC').getOne();
        if (!firstUpcoming) {
          return null;
        }

        firstUpcoming.list_position = '0';
        await manager.save(firstUpcoming);
        return firstUpcoming.id;
      });

      if (resourceId === null) {
        return null;
      }
      const loaded = await this.findQueueResourcesByIdListOrdered([resourceId]);
      return loaded[0] ?? null;
    });
  }

  async getAllUpcomingByQueueIdText(queue_id_text: string): Promise<QueueResource[]> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const idQb = this.repositoryRead
      .createQueryBuilder('qr')
      .where('qr.queue_id = :qid', { qid: queue.id })
      .andWhere('qr.list_position > 0');
    applyResolvesToActiveItemOrAddByRss('qr', idQb);
    const hits = await idQb.orderBy('qr.list_position', 'ASC').getMany();
    const ids = hits.map((e) => e.id);
    return this.findQueueResourcesByIdListOrdered(ids);
  }

  async getHistoryResourcesByQueueIdText(
    queue_id_text: string,
    options?: FindManyOptions<QueueResource>
  ): Promise<[QueueResource[], number]> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const merged = mergeHistoryListOptions(
      {
        where: { queue: { id: queue.id }, list_position: listPositionLessThanOrEqual(0) },
        order: {
          last_played_at: 'DESC' as FindOptionsOrderValue,
          list_position: 'DESC' as FindOptionsOrderValue,
        },
        relations: listResourceRelations,
      },
      options
    );
    const take = merged.take ?? 0;
    const skip = merged.skip ?? 0;

    const countQb = this.repositoryRead
      .createQueryBuilder('qr')
      .where('qr.queue_id = :qid', { qid: queue.id })
      .andWhere('qr.list_position <= 0');
    applyResolvesToActiveItemOrAddByRss('qr', countQb);
    const total = await countQb.getCount();

    const idQb = this.repositoryRead
      .createQueryBuilder('qr')
      .where('qr.queue_id = :qid', { qid: queue.id })
      .andWhere('qr.list_position <= 0');
    applyResolvesToActiveItemOrAddByRss('qr', idQb);
    const hits = await idQb
      // Invariant: now-playing has the newest playback timestamp among non-upcoming rows.
      .orderBy('qr.last_played_at', 'DESC', 'NULLS LAST')
      .addOrderBy('qr.list_position', 'DESC')
      .skip(skip)
      .take(take)
      .getMany();
    const ids = hits.map((e) => e.id);
    const data = await this.findQueueResourcesByIdListOrdered(ids, merged.relations);
    return [data, total];
  }

  async getItemsByQueueIdTextAndPosition(
    queue_id_text: string,
    position: string
  ): Promise<QueueResource[]> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    return this.repositoryRead.find({
      where: { queue: { id: queue.id }, list_position: position },
    });
  }

  async getFirstAndLastQueuedItemsByQueueIdText(
    queue_id_text: string
  ): Promise<{ firstQueued: QueueResource | null; lastQueued: QueueResource | null }> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    // Use `{ id }` — not the full entity. Passing `where: { queue }` expands unloaded
    // relations (e.g. `account: undefined`) and TypeORM rejects the undefined nested value.
    const firstQueued = await this.repositoryRead.findOne({
      where: { queue: { id: queue.id }, list_position: listPositionMoreThan(0) },
      order: { list_position: 'ASC' },
    });

    const lastQueued = await this.repositoryRead.findOne({
      where: { queue: { id: queue.id } },
      order: { list_position: 'DESC' },
    });

    return { firstQueued, lastQueued };
  }

  async getMostRecentHistoryItemByQueueIdText(
    queue_id_text: string
  ): Promise<QueueResource | null> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const mostRecentHistoryItem = await this.repositoryRead.findOne({
      where: { queue: { id: queue.id }, list_position: listPositionLessThan(0) },
      order: { list_position: 'DESC' },
    });

    return mostRecentHistoryItem;
  }

  private async addResourceToQueue(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: QueueLinkedResourceLookup,
    resourceKey: QueueLinkedResourceKey,
    calculatePosition: (
      firstQueued: QueueResource | null,
      lastQueued: QueueResource | null
    ) => string
  ): Promise<QueueResource> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const resource = await resourceService.getByIdText(resource_id_text);
    if (!resource) {
      throw new Error(`${resourceKey} not found.`);
    }

    const { firstQueued, lastQueued } =
      await this.getFirstAndLastQueuedItemsByQueueIdText(queue_id_text);
    const list_position = calculatePosition(firstQueued, lastQueued);

    const idColumn = queueResourceIdColumn(resourceKey);

    const finalDto = {
      [idColumn]: String(resource.id),
      list_position,
    };

    return this._update(queue, [idColumn], finalDto);
  }

  private async addResourceToQueueHelper(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: QueueLinkedResourceLookup,
    resourceKey: QueueLinkedResourceKey,
    calculatePosition: (
      firstQueued: QueueResource | null,
      lastQueued: QueueResource | null
    ) => string
  ): Promise<QueueResource> {
    return this.addResourceToQueue(
      queue_id_text,
      resource_id_text,
      resourceService,
      resourceKey,
      calculatePosition
    );
  }

  async addResourceToQueueNext(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: QueueLinkedResourceLookup,
    resourceKey: QueueLinkedResourceKey
  ): Promise<QueueResource> {
    const { firstQueued } = await this.getFirstAndLastQueuedItemsByQueueIdText(queue_id_text);
    const newPosition = firstQueued
      ? parseFloat(firstQueued.list_position) - QUEUE_LIST_POSITION_INCREMENT
      : 1;
    return this.addResourceToQueueHelper(
      queue_id_text,
      resource_id_text,
      resourceService,
      resourceKey,
      () => newPosition.toString()
    );
  }

  async addResourceToQueueLast(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: QueueLinkedResourceLookup,
    resourceKey: QueueLinkedResourceKey
  ): Promise<QueueResource> {
    const { lastQueued } = await this.getFirstAndLastQueuedItemsByQueueIdText(queue_id_text);
    const newPosition = lastQueued
      ? parseFloat(lastQueued.list_position) + QUEUE_LIST_POSITION_INCREMENT
      : '1';
    return this.addResourceToQueueHelper(
      queue_id_text,
      resource_id_text,
      resourceService,
      resourceKey,
      () => newPosition.toString()
    );
  }

  async addResourceToQueueBetween(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: QueueLinkedResourceLookup,
    resourceKey: QueueLinkedResourceKey,
    position1: number,
    position2: number
  ): Promise<QueueResource> {
    if (position1 >= position2) {
      throw new Error('Position1 should be less than Position2.');
    }

    return this.addResourceToQueueHelper(
      queue_id_text,
      resource_id_text,
      resourceService,
      resourceKey,
      () => {
        const pos1 = parseFloat(position1.toString());
        const pos2 = parseFloat(position2.toString());

        if (isNaN(pos1) || isNaN(pos2)) {
          throw new Error('Invalid positions provided.');
        }

        return ((pos1 + pos2) / 2).toString();
      }
    );
  }

  async addResourceToNowPlaying(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: QueueLinkedResourceLookup,
    resourceKey: QueueLinkedResourceKey,
    params: QueueExtraParams = {}
  ): Promise<QueueResource> {
    const lock = this.getQueueLock(queue_id_text);
    return lock.runExclusive(async () => {
      return await this.repositoryReadWrite.manager.transaction(async (manager) => {
        return this._addResourceToNowPlayingTransactional(
          manager,
          queue_id_text,
          resource_id_text,
          resourceService,
          resourceKey,
          params
        );
      });
    });
  }

  private async _addResourceToNowPlayingTransactional(
    manager: EntityManager,
    queue_id_text: string,
    resource_id_text: string,
    resourceService: QueueLinkedResourceLookup,
    resourceKey: QueueLinkedResourceKey,
    params: QueueExtraParams = {}
  ): Promise<QueueResource> {
    const queue = await manager.findOne(Queue, { where: { id_text: queue_id_text } });
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const resource = await resourceService.getByIdText(resource_id_text);
    if (!resource) {
      throw new Error(`${resourceKey} not found.`);
    }

    const queueResource = await this.applyLinkedPlaybackWriteTransactional(
      manager,
      queue_id_text,
      queue,
      resourceKey,
      String(resource.id),
      params,
      'now_playing'
    );
    if (!queueResource) {
      throw new Error('QueueResource not found after write.');
    }

    // Set this queue as the active queue (clear any other active queues for this account)
    if (resolveQueueZoneFromListPosition(queueResource.list_position) === 'now_playing') {
      await this._setQueueAsActiveTransactional(manager, queue);
    }

    return queueResource;
  }

  /**
   * Sets the given queue as the active queue for its account.
   * Clears is_active_queue on any other queues for the same account.
   */
  private async _setQueueAsActiveTransactional(
    manager: EntityManager,
    queue: { id: number }
  ): Promise<void> {
    // Get the queue with account relation to find the account_id
    const fullQueue = await manager.findOne(Queue, {
      where: { id: queue.id },
      relations: { account: true },
    });

    if (!fullQueue?.account?.id) {
      return; // Cannot set active queue without account
    }

    const accountId = fullQueue.account.id;

    // Clear is_active_queue on all queues for this account using query builder
    await manager
      .createQueryBuilder()
      .update(Queue)
      .set({ is_active_queue: false })
      .where('account_id = :accountId AND is_active_queue = true', { accountId })
      .execute();

    // Set this queue as active
    await manager
      .createQueryBuilder()
      .update(Queue)
      .set({ is_active_queue: true })
      .where('id = :id', { id: queue.id })
      .execute();
  }

  private async moveQueueResourceToHistoryByIdTransactional(
    manager: EntityManager,
    queue_id_text: string,
    queue_resource_id: number,
    params: QueueResourcePersistParams = {}
  ): Promise<QueueResource> {
    const queue = await manager.findOne(Queue, { where: { id_text: queue_id_text } });
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const queueResource = await manager.findOne(QueueResource, {
      where: { queue: { id: queue.id }, id: queue_resource_id },
    });
    if (!queueResource) {
      throw new Error('QueueResource not found.');
    }

    const mostRecentHistoryItem = await manager.findOne(QueueResource, {
      where: { queue: { id: queue.id }, list_position: listPositionLessThan(0) },
      order: { list_position: 'DESC' },
    });
    const newPosition = mostRecentHistoryItem
      ? parseFloat(mostRecentHistoryItem.list_position) + QUEUE_LIST_POSITION_INCREMENT
      : -1;

    Object.assign(queueResource, {
      ...params,
      list_position: newPosition.toString(),
    });

    return await manager.save(queueResource);
  }

  async addResourceToHistory(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: QueueLinkedResourceLookup,
    resourceKey: QueueLinkedResourceKey,
    params: QueueExtraParams
  ): Promise<QueueResource> {
    const lock = this.getQueueLock(queue_id_text);
    return lock.runExclusive(async () => {
      return await this.repositoryReadWrite.manager.transaction(async (manager) => {
        const queue = await manager.findOne(Queue, {
          where: { id_text: queue_id_text },
        });
        if (!queue) {
          throw new Error('Queue not found.');
        }

        const resource = await resourceService.getByIdText(resource_id_text);
        if (!resource) {
          throw new Error(`${resourceKey} not found.`);
        }
        const queueResource = await this.applyLinkedPlaybackWriteTransactional(
          manager,
          queue_id_text,
          queue,
          resourceKey,
          String(resource.id),
          params,
          'history'
        );
        if (!queueResource) {
          throw new Error('QueueResource not found after write.');
        }
        return queueResource;
      });
    });
  }

  async replayPlaybackEvents(
    queue_id_text: string,
    events: QueuePlaybackReplayEvent[]
  ): Promise<QueueResource[]> {
    if (events.length === 0) {
      return [];
    }
    if (events.length > PLAYBACK_REPLAY_BATCH_LIMIT) {
      throw new Error(
        `Playback replay batch exceeds limit (${PLAYBACK_REPLAY_BATCH_LIMIT}) for one request.`
      );
    }

    const lock = this.getQueueLock(queue_id_text);
    return lock.runExclusive(async () => {
      return this.repositoryReadWrite.manager.transaction(async (manager) => {
        const queue = await manager.findOne(Queue, {
          where: { id_text: queue_id_text },
        });
        if (!queue) {
          throw new Error('Queue not found.');
        }

        await manager.query('SELECT pg_advisory_xact_lock($1, $2)', [
          REPLAY_ADVISORY_LOCK_NAMESPACE,
          queue.id,
        ]);

        const receivedAtIso = new Date().toISOString();
        const sorted = [...events]
          .map((event) => ({
            clampedLastPlayedAt: clampClientPlaybackTimestamp(event.last_played_at, receivedAtIso),
            event,
          }))
          .sort((left, right) => {
            const leftMs = toEpochMsOrNull(left.clampedLastPlayedAt) ?? 0;
            const rightMs = toEpochMsOrNull(right.clampedLastPlayedAt) ?? 0;
            return leftMs - rightMs;
          });

        const touchedRows: QueueResource[] = [];
        for (const sortedEvent of sorted) {
          const replayEvent = this.getReplayResourceEvent(sortedEvent.event);

          const replayParams: QueueExtraParams = {
            completed: replayEvent.event.completed,
            last_played_at: sortedEvent.clampedLastPlayedAt,
            media_file_duration: replayEvent.event.media_file_duration,
            playback_event_kind: replayEvent.event.playback_event_kind,
            playback_position: replayEvent.event.playback_position,
          };

          const fallbackZone = resolveFallbackPlaybackZoneForEvent(
            replayEvent.event.playback_event_kind
          );

          const queueResource =
            'resourceService' in replayEvent
              ? await (async () => {
                  const resource = await replayEvent.resourceService.getByIdText(
                    replayEvent.idText
                  );
                  if (!resource) {
                    throw new Error(`${replayEvent.resourceKey} not found.`);
                  }
                  return this.applyLinkedPlaybackWriteTransactional(
                    manager,
                    queue_id_text,
                    queue,
                    replayEvent.resourceKey,
                    String(resource.id),
                    replayParams,
                    fallbackZone,
                    receivedAtIso
                  );
                })()
              : await this.applyAddByRssPlaybackWriteTransactional(
                  manager,
                  queue_id_text,
                  queue,
                  replayEvent.addByRssHashId,
                  replayEvent.addByRssResourceData,
                  replayParams,
                  fallbackZone,
                  receivedAtIso
                );

          if (queueResource) {
            touchedRows.push(queueResource);
          }
        }

        return touchedRows;
      });
    });
  }

  async removeResourceFromQueue(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: QueueLinkedResourceLookup,
    resourceKey: QueueLinkedResourceKey,
    params: Pick<QueueExtraParams, 'last_played_at'> = {}
  ): Promise<void> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const resource = await resourceService.getByIdText(resource_id_text);
    if (!resource) {
      throw new Error(`${resourceKey} not found.`);
    }

    const where = queueResourceDeleteWhere(resourceKey, String(resource.id));
    if (params.last_played_at) {
      const existing = await this.repositoryRead.findOne({
        where: { queue: { id: queue.id }, ...where },
      });
      if (existing?.last_played_at) {
        const receivedAtIso = new Date().toISOString();
        const clampedLastPlayedAt = clampClientPlaybackTimestamp(
          params.last_played_at,
          receivedAtIso
        );
        const incomingMs = toEpochMsOrNull(clampedLastPlayedAt);
        const existingMs = toEpochMsOrNull(toIsoOrNull(existing.last_played_at));
        if (existingMs !== null && incomingMs !== null && existingMs > incomingMs) {
          return;
        }
      }
    }

    return this._delete(queue, where);
  }

  async addClipToQueueNext(queue_id_text: string, clip_id_text: string): Promise<QueueResource> {
    return this.addResourceToQueueNext(queue_id_text, clip_id_text, this.clipService, 'clip');
  }

  async addClipToQueueLast(queue_id_text: string, clip_id_text: string): Promise<QueueResource> {
    return this.addResourceToQueueLast(queue_id_text, clip_id_text, this.clipService, 'clip');
  }

  async addClipToQueueBetween(
    queue_id_text: string,
    clip_id_text: string,
    position1: number,
    position2: number
  ): Promise<QueueResource> {
    return this.addResourceToQueueBetween(
      queue_id_text,
      clip_id_text,
      this.clipService,
      'clip',
      position1,
      position2
    );
  }

  async addClipToNowPlaying(
    queue_id_text: string,
    clip_id_text: string,
    params: QueueExtraParams = {}
  ): Promise<QueueResource> {
    return this.addResourceToNowPlaying(
      queue_id_text,
      clip_id_text,
      this.clipService,
      'clip',
      params
    );
  }

  async addClipToHistory(
    queue_id_text: string,
    clip_id_text: string,
    params: QueueExtraParams
  ): Promise<QueueResource> {
    return this.addResourceToHistory(queue_id_text, clip_id_text, this.clipService, 'clip', params);
  }

  async removeClipFromQueue(
    queue_id_text: string,
    clip_id_text: string,
    params: Pick<QueueExtraParams, 'last_played_at'> = {}
  ): Promise<void> {
    return this.removeResourceFromQueue(
      queue_id_text,
      clip_id_text,
      this.clipService,
      'clip',
      params
    );
  }

  async addItemToQueueNext(queue_id_text: string, item_id_text: string): Promise<QueueResource> {
    return this.addResourceToQueueNext(queue_id_text, item_id_text, this.itemService, 'item');
  }

  async addItemToQueueLast(queue_id_text: string, item_id_text: string): Promise<QueueResource> {
    return this.addResourceToQueueLast(queue_id_text, item_id_text, this.itemService, 'item');
  }

  async addItemToQueueBetween(
    queue_id_text: string,
    item_id_text: string,
    position1: number,
    position2: number
  ): Promise<QueueResource> {
    return this.addResourceToQueueBetween(
      queue_id_text,
      item_id_text,
      this.itemService,
      'item',
      position1,
      position2
    );
  }

  async addItemToNowPlaying(
    queue_id_text: string,
    item_id_text: string,
    params: QueueExtraParams = {}
  ): Promise<QueueResource> {
    return this.addResourceToNowPlaying(
      queue_id_text,
      item_id_text,
      this.itemService,
      'item',
      params
    );
  }

  async addItemToHistory(
    queue_id_text: string,
    item_id_text: string,
    params: QueueExtraParams
  ): Promise<QueueResource> {
    return this.addResourceToHistory(queue_id_text, item_id_text, this.itemService, 'item', params);
  }

  async removeItemFromQueue(
    queue_id_text: string,
    item_id_text: string,
    params: Pick<QueueExtraParams, 'last_played_at'> = {}
  ): Promise<void> {
    return this.removeResourceFromQueue(
      queue_id_text,
      item_id_text,
      this.itemService,
      'item',
      params
    );
  }

  async addItemSoundbiteToQueueNext(
    queue_id_text: string,
    item_soundbite_id_text: string
  ): Promise<QueueResource> {
    return this.addResourceToQueueNext(
      queue_id_text,
      item_soundbite_id_text,
      this.itemSoundbiteService,
      'item_soundbite'
    );
  }

  async addItemSoundbiteToQueueLast(
    queue_id_text: string,
    item_soundbite_id_text: string
  ): Promise<QueueResource> {
    return this.addResourceToQueueLast(
      queue_id_text,
      item_soundbite_id_text,
      this.itemSoundbiteService,
      'item_soundbite'
    );
  }

  async addItemSoundbiteToQueueBetween(
    queue_id_text: string,
    item_soundbite_id_text: string,
    position1: number,
    position2: number
  ): Promise<QueueResource> {
    return this.addResourceToQueueBetween(
      queue_id_text,
      item_soundbite_id_text,
      this.itemSoundbiteService,
      'item_soundbite',
      position1,
      position2
    );
  }

  async addItemSoundbiteToNowPlaying(
    queue_id_text: string,
    item_soundbite_id_text: string,
    params: QueueExtraParams = {}
  ): Promise<QueueResource> {
    return this.addResourceToNowPlaying(
      queue_id_text,
      item_soundbite_id_text,
      this.itemSoundbiteService,
      'item_soundbite',
      params
    );
  }

  async addItemSoundbiteToHistory(
    queue_id_text: string,
    item_soundbite_id_text: string,
    params: QueueExtraParams
  ): Promise<QueueResource> {
    return this.addResourceToHistory(
      queue_id_text,
      item_soundbite_id_text,
      this.itemSoundbiteService,
      'item_soundbite',
      params
    );
  }

  async removeItemSoundbiteFromQueue(
    queue_id_text: string,
    item_soundbite_id_text: string,
    params: Pick<QueueExtraParams, 'last_played_at'> = {}
  ): Promise<void> {
    return this.removeResourceFromQueue(
      queue_id_text,
      item_soundbite_id_text,
      this.itemSoundbiteService,
      'item_soundbite',
      params
    );
  }

  private async addItemAddByRSSToQueue(
    queue_id_text: string,
    add_by_rss_resource_data: object,
    calculatePosition: (
      firstQueued: QueueResource | null,
      lastQueued: QueueResource | null
    ) => string
  ): Promise<QueueResource> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const { firstQueued, lastQueued } =
      await this.getFirstAndLastQueuedItemsByQueueIdText(queue_id_text);
    const list_position = calculatePosition(
      firstQueued as QueueResource,
      lastQueued as QueueResource
    );
    const add_by_rss_hash_id = getAddByRSSHashId(add_by_rss_resource_data);

    const finalDto = {
      add_by_rss_resource_data,
      list_position,
      add_by_rss_hash_id,
    };

    return this._update(queue, ['queue', 'add_by_rss_hash_id'], finalDto);
  }

  private async addItemAddByRSSToQueueHelper(
    queue_id_text: string,
    add_by_rss_resource_data: object,
    calculatePosition: (
      firstQueued: QueueResource | null,
      lastQueued: QueueResource | null
    ) => string
  ): Promise<QueueResource> {
    return this.addItemAddByRSSToQueue(queue_id_text, add_by_rss_resource_data, calculatePosition);
  }

  async addItemAddByRSSToQueueNext(
    queue_id_text: string,
    add_by_rss_resource_data: object
  ): Promise<QueueResource> {
    return this.addItemAddByRSSToQueueHelper(
      queue_id_text,
      add_by_rss_resource_data,
      (firstQueued) => {
        const newPosition = firstQueued
          ? parseFloat(firstQueued.list_position) - QUEUE_LIST_POSITION_INCREMENT
          : 1;
        return newPosition < 0 ? '0' : newPosition.toString();
      }
    );
  }

  async addItemAddByRSSToQueueLast(
    queue_id_text: string,
    add_by_rss_resource_data: object
  ): Promise<QueueResource> {
    return this.addItemAddByRSSToQueueHelper(
      queue_id_text,
      add_by_rss_resource_data,
      (_, lastQueued) => {
        return lastQueued
          ? (parseFloat(lastQueued.list_position) + QUEUE_LIST_POSITION_INCREMENT).toString()
          : '1';
      }
    );
  }

  async addItemAddByRSSToQueueBetween(
    queue_id_text: string,
    add_by_rss_resource_data: object,
    position1: number,
    position2: number
  ): Promise<QueueResource> {
    if (position1 >= position2) {
      throw new Error('Position1 should be less than Position2.');
    }

    return this.addItemAddByRSSToQueueHelper(queue_id_text, add_by_rss_resource_data, () => {
      const pos1 = parseFloat(position1.toString());
      const pos2 = parseFloat(position2.toString());

      if (isNaN(pos1) || isNaN(pos2)) {
        throw new Error('Invalid positions provided.');
      }

      return ((pos1 + pos2) / 2).toString();
    });
  }

  async addItemAddByRSSToNowPlaying(
    queue_id_text: string,
    add_by_rss_resource_data: object,
    params: QueueExtraParams = {}
  ): Promise<QueueResource> {
    const lock = this.getQueueLock(queue_id_text);
    return lock.runExclusive(async () => {
      return await this.repositoryReadWrite.manager.transaction(async (manager) => {
        return this._addItemAddByRSSToNowPlayingTransactional(
          manager,
          queue_id_text,
          add_by_rss_resource_data,
          params
        );
      });
    });
  }

  private async _addItemAddByRSSToNowPlayingTransactional(
    manager: EntityManager,
    queue_id_text: string,
    add_by_rss_resource_data: object,
    params: QueueExtraParams = {}
  ): Promise<QueueResource> {
    const queue = await manager.findOne(Queue, { where: { id_text: queue_id_text } });
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const add_by_rss_hash_id = getAddByRSSHashId(add_by_rss_resource_data);

    const existingNowPlaying = await manager.findOne(QueueResource, {
      where: { queue: { id: queue.id }, list_position: nowPlayingListPositionWhere() },
    });

    // Always move current now-playing to history so position 0 is free. Avoids violating
    // UNIQUE (queue_id, list_position) when we insert/update below.
    if (existingNowPlaying) {
      await this.moveQueueResourceToHistoryByIdTransactional(
        manager,
        queue_id_text,
        existingNowPlaying.id
      );
    }

    let queueResource = await manager.findOne(QueueResource, {
      where: { queue: { id: queue.id }, add_by_rss_hash_id },
    });

    // If the only matching row is the one we just moved to history (same hash: replay),
    // update that row back to now-playing to avoid violating UNIQUE (queue_id, add_by_rss_hash_id).
    const isMovedRow = existingNowPlaying && queueResource?.id === existingNowPlaying.id;

    const extraFields = {
      ...(params.playback_position !== undefined && {
        playback_position: params.playback_position,
      }),
      ...(params.media_file_duration !== undefined && {
        media_file_duration: params.media_file_duration,
      }),
    };

    if (isMovedRow && queueResource) {
      Object.assign(queueResource, {
        add_by_rss_resource_data,
        list_position: '0',
        ...extraFields,
      });
    } else if (!queueResource) {
      queueResource = manager.create(QueueResource, {
        queue,
        add_by_rss_resource_data,
        add_by_rss_hash_id,
        list_position: '0',
        ...extraFields,
      });
    } else {
      Object.assign(queueResource, {
        add_by_rss_resource_data,
        list_position: '0',
        ...extraFields,
      });
    }

    // Set this queue as the active queue (clear any other active queues for this account)
    await this._setQueueAsActiveTransactional(manager, queue);

    return manager.save(queueResource);
  }

  async addItemAddByRSSToHistory(
    queue_id_text: string,
    add_by_rss_resource_data: object,
    params: QueueExtraParams = {}
  ): Promise<QueueResource> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const add_by_rss_hash_id = getAddByRSSHashId(add_by_rss_resource_data);

    const mostRecentHistoryItem = await this.getMostRecentHistoryItemByQueueIdText(queue_id_text);
    const newPosition = mostRecentHistoryItem
      ? parseFloat(mostRecentHistoryItem.list_position) + QUEUE_LIST_POSITION_INCREMENT
      : -1;

    const existing = await this.repositoryRead.findOne({
      where: { queue: { id: queue.id }, add_by_rss_hash_id },
    });

    if (existing) {
      existing.list_position = newPosition.toString();
      if (params.completed !== undefined) {
        existing.completed = params.completed;
      }
      if (params.playback_position !== undefined) {
        existing.playback_position = params.playback_position;
      }
      if (params.media_file_duration !== undefined) {
        existing.media_file_duration = params.media_file_duration;
      }
      return this.repositoryReadWrite.save(existing);
    }

    const finalDto = {
      add_by_rss_resource_data,
      list_position: newPosition.toString(),
      add_by_rss_hash_id,
      ...(params.completed !== undefined && { completed: params.completed }),
      ...(params.playback_position !== undefined && {
        playback_position: params.playback_position,
      }),
      ...(params.media_file_duration !== undefined && {
        media_file_duration: params.media_file_duration,
      }),
    };

    return this._update(queue, ['queue', 'add_by_rss_hash_id'], finalDto);
  }

  async removeItemAddByRSSFromQueue(
    queue_id_text: string,
    add_by_rss_hash_id: string,
    params: Pick<QueueExtraParams, 'last_played_at'> = {}
  ): Promise<void> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    if (params.last_played_at) {
      const existing = await this.repositoryRead.findOne({
        where: { queue: { id: queue.id }, add_by_rss_hash_id },
      });
      if (existing?.last_played_at) {
        const receivedAtIso = new Date().toISOString();
        const clampedLastPlayedAt = clampClientPlaybackTimestamp(
          params.last_played_at,
          receivedAtIso
        );
        const incomingMs = toEpochMsOrNull(clampedLastPlayedAt);
        const existingMs = toEpochMsOrNull(toIsoOrNull(existing.last_played_at));
        if (existingMs !== null && incomingMs !== null && existingMs > incomingMs) {
          return;
        }
      }
    }

    return this._delete(queue, { add_by_rss_hash_id });
  }
}
