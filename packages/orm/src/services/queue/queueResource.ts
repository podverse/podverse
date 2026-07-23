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

import type { DTOQueueResourceAbridgedResponseData, QueueExtraParams } from '@podverse/helpers';
import { getAddByRSSHashId } from '@podverse/helpers';

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

function queueResourceLinkedId(row: QueueResource, resourceKey: QueueLinkedResourceKey): string {
  if (resourceKey === 'clip') {
    return row.clip_id;
  }
  if (resourceKey === 'item') {
    return row.item_id;
  }
  return row.item_soundbite_id;
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
  params: QueueExtraParams
): DeepPartial<QueueResource> {
  const base: DeepPartial<QueueResource> = { queue, list_position, ...params };
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
        order: { list_position: 'DESC' as FindOptionsOrderValue },
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
    const hits = await idQb.orderBy('qr.list_position', 'DESC').skip(skip).take(take).getMany();
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

    const resourceId = String(resource.id);

    const existingNowPlaying = await manager.findOne(QueueResource, {
      where: { queue: { id: queue.id }, list_position: nowPlayingListPositionWhere() },
    });

    if (
      existingNowPlaying &&
      queueResourceLinkedId(existingNowPlaying, resourceKey) === resourceId &&
      existingNowPlaying.list_position === params.playback_position
    ) {
      return existingNowPlaying;
    }

    if (existingNowPlaying && resourceId !== String(existingNowPlaying.id)) {
      await this.moveQueueResourceToHistoryByIdTransactional(
        manager,
        queue_id_text,
        existingNowPlaying.id
      );
    }

    let queueResource = await manager.findOne(QueueResource, {
      where: queueResourceWhereByLinkedId(queue.id, resourceKey, resourceId),
    });

    if (!queueResource) {
      queueResource = manager.create(
        QueueResource,
        queueResourceCreatePartial(queue, resourceKey, resourceId, '0', params)
      );
    } else {
      Object.assign(
        queueResource,
        queueResourceCreatePartial(queue, resourceKey, resourceId, '0', params)
      );
    }

    // Set this queue as the active queue (clear any other active queues for this account)
    await this._setQueueAsActiveTransactional(manager, queue);

    return await manager.save(queueResource);
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
    params: QueueExtraParams = {}
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

        const resourceId = String(resource.id);

        const mostRecentHistoryItem = await manager.findOne(QueueResource, {
          where: { queue: { id: queue.id }, list_position: listPositionLessThan(0) },
          order: { list_position: 'DESC' },
        });

        const newPosition = mostRecentHistoryItem
          ? parseFloat(mostRecentHistoryItem.list_position) + QUEUE_LIST_POSITION_INCREMENT
          : -1;

        let queueResource = await manager.findOne(QueueResource, {
          where: queueResourceWhereByLinkedId(queue.id, resourceKey, resourceId),
        });

        if (!queueResource) {
          queueResource = manager.create(
            QueueResource,
            queueResourceCreatePartial(
              queue,
              resourceKey,
              resourceId,
              newPosition.toString(),
              params
            )
          );
        } else {
          Object.assign(
            queueResource,
            queueResourceCreatePartial(
              queue,
              resourceKey,
              resourceId,
              newPosition.toString(),
              params
            )
          );
        }

        return await manager.save(queueResource);
      });
    });
  }

  async removeResourceFromQueue(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: QueueLinkedResourceLookup,
    resourceKey: QueueLinkedResourceKey
  ): Promise<void> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const resource = await resourceService.getByIdText(resource_id_text);
    if (!resource) {
      throw new Error(`${resourceKey} not found.`);
    }

    return this._delete(queue, queueResourceDeleteWhere(resourceKey, String(resource.id)));
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

  async removeClipFromQueue(queue_id_text: string, clip_id_text: string): Promise<void> {
    return this.removeResourceFromQueue(queue_id_text, clip_id_text, this.clipService, 'clip');
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

  async removeItemFromQueue(queue_id_text: string, item_id_text: string): Promise<void> {
    return this.removeResourceFromQueue(queue_id_text, item_id_text, this.itemService, 'item');
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
    item_soundbite_id_text: string
  ): Promise<void> {
    return this.removeResourceFromQueue(
      queue_id_text,
      item_soundbite_id_text,
      this.itemSoundbiteService,
      'item_soundbite'
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
    add_by_rss_hash_id: string
  ): Promise<void> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    return this._delete(queue, { add_by_rss_hash_id });
  }
}
