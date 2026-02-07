/* eslint-disable @typescript-eslint/no-explicit-any */
import { Mutex } from 'async-mutex';
import type { QueueExtraParams } from '@podverse/helpers';
import { getAddByRSSHashId } from '@podverse/helpers';
import type { EntityManager, FindManyOptions, FindOptionsOrderValue } from 'typeorm';
import { Between, LessThan, LessThanOrEqual, MoreThan } from 'typeorm';
import { QueueResource } from '@orm/entities/queue/queueResource.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { QueueService } from '@orm/services/queue/queue.js';
import { ClipService } from '../clip.js';
import { ItemService } from '../item/item.js';
import { ItemSoundbiteService } from '../item/itemSoundbite.js';

const QUEUE_LIST_POSITION_INCREMENT = 0.00000001;

const epsilon = 1e-21;

export const listResourceRelations = [
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
];

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

  async getAllByAccountAbridged(account_id: number): Promise<any[]> {
    const queues = await this.queueService.getAllPrivate(account_id);
    if (!queues.length) {
      throw new Error('No queues found for account.');
    }
    const queueIds = queues.map((q) => q.id);

    return this.repositoryRead
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
      .where('qr.queue_id IN (:...queueIds)', { queueIds })
      .orderBy('qr.list_position', 'ASC')
      .getRawMany();
  }

  async getNowPlayingByQueueIdText(queue_id_text: string): Promise<QueueResource | null> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const options = {
      where: { queue: { id: queue.id }, list_position: Between(-epsilon, epsilon) as any },
      order: { list_position: 'ASC' as FindOptionsOrderValue },
      relations: listResourceRelations,
    };

    const rows = await this.repositoryRead.find(options);

    if (!rows || rows.length === 0) {
      return null;
    }

    const firstRow = rows[0];
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

    const options = {
      where: { queue: { id: queue.id }, list_position: MoreThan(0) as any },
      order: { list_position: 'ASC' as FindOptionsOrderValue },
      relations: listResourceRelations,
    };

    return this.repositoryRead.find(options);
  }

  async getHistoryResourcesByQueueIdText(
    queue_id_text: string,
    options?: FindManyOptions<QueueResource>
  ): Promise<[QueueResource[], number]> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    return this.repositoryRead.findAndCount({
      where: { queue: { id: queue.id }, list_position: LessThanOrEqual(0) as any },
      order: { list_position: 'DESC' as FindOptionsOrderValue },
      relations: listResourceRelations,
      ...options,
    });
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
      where: { queue, list_position: position },
    });
  }

  async getFirstAndLastQueuedItemsByQueueIdText(
    queue_id_text: string
  ): Promise<{ firstQueued: QueueResource | null; lastQueued: QueueResource | null }> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const firstQueued = await this.repositoryRead.findOne({
      where: { queue, list_position: MoreThan(0) as any },
      order: { list_position: 'ASC' },
    });

    const lastQueued = await this.repositoryRead.findOne({
      where: { queue },
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
      where: { queue, list_position: LessThan(0) as any },
      order: { list_position: 'DESC' },
    });

    return mostRecentHistoryItem;
  }

  private async addResourceToQueue(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: any,
    resourceKey: keyof QueueResource,
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

    const resourceKeyId = `${resourceKey}_id` as any;

    const finalDto = {
      [resourceKeyId]: resource.id,
      list_position,
    };

    return this._update(queue, [resourceKeyId], finalDto);
  }

  private async addResourceToQueueHelper(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: any,
    resourceKey: keyof QueueResource,
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
    resourceService: any,
    resourceKey: keyof QueueResource
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
    resourceService: any,
    resourceKey: keyof QueueResource
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
    resourceService: any,
    resourceKey: keyof QueueResource,
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
    resourceService: any,
    resourceKey: keyof QueueResource,
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
    resourceService: any,
    resourceKey: keyof QueueResource,
    params: QueueExtraParams = {}
  ): Promise<QueueResource> {
    const queue = (await manager.findOne('Queue', { where: { id_text: queue_id_text } })) as any;
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const resource = await resourceService.getByIdText(resource_id_text);
    if (!resource) {
      throw new Error(`${resourceKey} not found.`);
    }

    const existingNowPlaying = (await manager.findOne(QueueResource, {
      where: { queue: { id: queue.id }, list_position: Between(-epsilon, epsilon) as any },
    })) as any;

    if (
      existingNowPlaying &&
      existingNowPlaying[`${resourceKey}_id`] === resource.id &&
      existingNowPlaying.list_position === params.playback_position
    ) {
      return existingNowPlaying;
    }

    if (existingNowPlaying && resource.id !== existingNowPlaying.id) {
      await this.moveQueueResourceToHistoryByIdTransactional(
        manager,
        queue_id_text,
        existingNowPlaying.id
      );
    }

    let queueResource = await manager.findOne(QueueResource, {
      where: { queue: { id: queue.id }, [`${resourceKey}_id`]: resource.id },
    });

    if (!queueResource) {
      queueResource = manager.create(QueueResource, {
        queue,
        [`${resourceKey}`]: resource,
        list_position: '0',
        ...params,
      });
    } else {
      Object.assign(queueResource, {
        [`${resourceKey}`]: resource,
        list_position: '0',
        ...params,
      });
    }

    return await manager.save(queueResource);
  }

  private async moveQueueResourceToHistoryByIdTransactional(
    manager: EntityManager,
    queue_id_text: string,
    queue_resource_id: number,
    params: QueueExtraParams = {}
  ): Promise<QueueResource> {
    const queue = (await manager.findOne('Queue', { where: { id_text: queue_id_text } })) as any;
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
      where: { queue: { id: queue.id }, list_position: LessThan(0) as any },
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
    resourceService: any,
    resourceKey: keyof QueueResource,
    params: QueueExtraParams
  ): Promise<QueueResource> {
    const lock = this.getQueueLock(queue_id_text);
    return lock.runExclusive(async () => {
      return await this.repositoryReadWrite.manager.transaction(async (manager) => {
        const queue = (await manager.findOne('Queue', {
          where: { id_text: queue_id_text },
        })) as any;
        if (!queue) {
          throw new Error('Queue not found.');
        }

        const resource = await resourceService.getByIdText(resource_id_text);
        if (!resource) {
          throw new Error(`${resourceKey} not found.`);
        }

        const mostRecentHistoryItem = await manager.findOne(QueueResource, {
          where: { queue: { id: queue.id }, list_position: LessThan(0) as any },
          order: { list_position: 'DESC' },
        });

        const newPosition = mostRecentHistoryItem
          ? parseFloat(mostRecentHistoryItem.list_position) + QUEUE_LIST_POSITION_INCREMENT
          : -1;

        let queueResource = await manager.findOne(QueueResource, {
          where: { queue: { id: queue.id }, [`${resourceKey}_id`]: resource.id },
        });

        if (!queueResource) {
          queueResource = manager.create(QueueResource, {
            queue,
            [`${resourceKey}`]: resource,
            list_position: newPosition.toString(),
            ...params,
          });
        } else {
          Object.assign(queueResource, {
            [`${resourceKey}`]: resource,
            list_position: newPosition.toString(),
            ...params,
          });
        }

        return await manager.save(queueResource);
      });
    });
  }

  async removeResourceFromQueue(
    queue_id_text: string,
    resource_id_text: string,
    resourceService: any,
    resourceKey: keyof QueueResource
  ): Promise<void> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const resource = await resourceService.getByIdText(resource_id_text);
    if (!resource) {
      throw new Error(`${resourceKey} not found.`);
    }

    return this._delete(queue, { [`${resourceKey}_id`]: resource.id });
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
    add_by_rss_resource_data: object
  ): Promise<QueueResource> {
    const queue = await this.queueService.getByIdText(queue_id_text);
    if (!queue) {
      throw new Error('Queue not found.');
    }

    const add_by_rss_hash_id = getAddByRSSHashId(add_by_rss_resource_data);

    const finalDto = {
      add_by_rss_resource_data,
      list_position: '0',
      add_by_rss_hash_id,
    };

    return this._update(queue, ['queue', 'add_by_rss_hash_id'], finalDto);
  }

  async addItemAddByRSSToHistory(
    queue_id_text: string,
    add_by_rss_resource_data: object
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

    const finalDto = {
      add_by_rss_resource_data,
      list_position: newPosition.toString(),
      add_by_rss_hash_id,
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
