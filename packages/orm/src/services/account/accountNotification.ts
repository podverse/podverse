import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { AccountNotification } from '@orm/entities/account/accountNotification.js';
import type { FindOptionsWhere, Repository } from 'typeorm';
import { LessThan, MoreThan } from 'typeorm';

type CreateAccountNotificationDto = {
  account_id: number;
  category: AccountNotification['category'];
  title: string;
  body?: string | null;
  link_path?: string | null;
  payload?: Record<string, unknown> | null;
  created_at?: Date;
  expires_at?: Date;
};

type ListPaginatedForAccountParams = {
  before_created_at?: Date;
  offset?: number;
  limit?: number;
};

const MAX_PAGE_SIZE = 100;
const DEFAULT_PAGE_SIZE = 20;

export class AccountNotificationService {
  protected repositoryRead: Repository<AccountNotification>;
  protected repositoryReadWrite: Repository<AccountNotification>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AccountNotification);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AccountNotification);
  }

  async createMany(dtoList: CreateAccountNotificationDto[]): Promise<AccountNotification[]> {
    if (dtoList.length === 0) {
      return [];
    }

    const rows = dtoList.map((dto) =>
      this.repositoryReadWrite.create({
        account_id: dto.account_id,
        body: dto.body ?? null,
        category: dto.category,
        created_at: dto.created_at,
        expires_at: dto.expires_at,
        link_path: dto.link_path ?? null,
        payload: dto.payload ?? null,
        title: dto.title,
      })
    );

    return this.repositoryReadWrite.save(rows);
  }

  async listPaginatedForAccount(
    account_id: number,
    params?: ListPaginatedForAccountParams
  ): Promise<AccountNotification[]> {
    const limit = Math.max(1, Math.min(params?.limit ?? DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE));
    const offset = Math.max(0, params?.offset ?? 0);
    const where: FindOptionsWhere<AccountNotification> = { account_id };

    if (params?.before_created_at !== undefined) {
      where.created_at = LessThan(params.before_created_at);
    }

    return this.repositoryRead.find({
      order: {
        created_at: 'DESC',
        id: 'DESC',
      },
      skip: offset,
      take: limit,
      where,
    });
  }

  /**
   * Rows created after the account last opened its inbox. A null timestamp means it has never been
   * opened, so everything counts.
   */
  async countUnread(account_id: number, last_read_at: Date | null): Promise<number> {
    if (last_read_at === null) {
      return this.repositoryRead.count({
        where: {
          account_id,
        },
      });
    }

    return this.repositoryRead.count({
      where: {
        account_id,
        created_at: MoreThan(last_read_at),
      },
    });
  }

  /**
   * Honours a row's own `expires_at`, which lets a notification declare a life shorter than the
   * retention window — a maintenance notice for a window that has closed, say.
   */
  async deleteExpiredBefore(cutoff: Date): Promise<number> {
    const result = await this.repositoryReadWrite.delete({
      expires_at: LessThan(cutoff),
    });

    return result.affected ?? 0;
  }

  /**
   * The retention ceiling, applied to rows already in the table rather than only to ones inserted
   * after the operator changed it. Shortening the window therefore takes effect on the next purge.
   */
  async deleteCreatedBefore(cutoff: Date): Promise<number> {
    const result = await this.repositoryReadWrite.delete({
      created_at: LessThan(cutoff),
    });

    return result.affected ?? 0;
  }
}
