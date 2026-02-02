import { supportedQueueMediums } from '@podverse/helpers';
import type { EntityManager, FindManyOptions, FindOneOptions } from 'typeorm';
import { Queue } from '@orm/entities/queue/queue.js';
import { BaseManyService } from '@orm/services/base/baseManyService.js';
import { AccountService } from '@orm/services/account/account.js';

export type QueueDto = {
  medium_id: number;
};

export class QueueService extends BaseManyService<Queue, 'account'> {
  private accountService: AccountService;

  constructor(transactionalEntityManager?: EntityManager) {
    super(Queue, 'account', transactionalEntityManager);
    this.accountService = new AccountService();
  }

  async create(account_id: number, dto: QueueDto): Promise<Queue> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    const whereKeys = [] as (keyof Queue)[];
    return this._update(account, whereKeys, dto);
  }

  async getByIdText(queue_id_text: string, config?: FindOneOptions<Queue>): Promise<Queue | null> {
    return this.repositoryRead.findOne({
      where: {
        id_text: queue_id_text,
      },
      ...config,
    });
  }

  async getAllPrivate(account_id: number, config?: FindManyOptions<Queue>): Promise<Queue[]> {
    const account = await this.accountService.get(account_id);
    if (!account) {
      throw new Error('Account not found.');
    }

    let results = await this._getAll(account, config);

    const existingMediums = new Set(results.map((q) => Number(q.medium_id)));

    const missingMediums: number[] = [];
    for (const mediumKey of Object.keys(supportedQueueMediums)) {
      const medium_id = Number(mediumKey);
      if (supportedQueueMediums[medium_id] && !existingMediums.has(medium_id)) {
        missingMediums.push(medium_id);
      }
    }

    if (missingMediums.length > 0) {
      for (const medium_id of missingMediums) {
        await this.create(account_id, { medium_id });
      }
      results = await this._getAll(account, config);
    }

    return results;
  }

  async updateIsActiveQueue(
    account_id: number,
    queue_id_text: string,
    is_active_queue: boolean
  ): Promise<void> {
    const queues = await this.getAllPrivate(account_id);

    const currentActiveQueue = queues.find((q) => q.is_active_queue);

    const targetQueue = queues.find((q) => q.id_text === queue_id_text);

    if (!targetQueue) {
      throw new Error(`Queue with id_text ${queue_id_text} not found for account ${account_id}`);
    }

    if (is_active_queue && targetQueue.is_active_queue) {
      return;
    }

    if (currentActiveQueue && currentActiveQueue.id_text !== queue_id_text) {
      await this.repositoryReadWrite.update(
        { id: currentActiveQueue.id },
        { is_active_queue: false }
      );
    }

    if (targetQueue.is_active_queue !== is_active_queue) {
      await this.repositoryReadWrite.update({ id: targetQueue.id }, { is_active_queue });
    }
  }
}
