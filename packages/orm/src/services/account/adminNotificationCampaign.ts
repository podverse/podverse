import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { AdminNotificationCampaign } from '@orm/entities/account/adminNotificationCampaign.js';
import type { FindOptionsWhere, Repository } from 'typeorm';

import type {
  AdminNotificationAudience,
  AdminNotificationCampaignStatusValues,
  NotificationCategoryValues,
} from '@podverse/helpers';
import { AdminNotificationCampaignStatusEnum } from '@podverse/helpers';

type CreateAdminNotificationCampaignDto = {
  title: string;
  body?: string | null;
  link_path?: string | null;
  category: NotificationCategoryValues;
  audience: AdminNotificationAudience;
  send_push: boolean;
  status?: AdminNotificationCampaignStatusValues;
  scheduled_at?: Date | null;
  created_by_admin_id?: number | null;
  scheduled_job_dedupe_key?: string | null;
};

type ListAdminNotificationCampaignsParams = {
  page: number;
  limit: number;
  status?: AdminNotificationCampaignStatusValues;
  category?: NotificationCategoryValues;
};

export class AdminNotificationCampaignService {
  protected repositoryRead: Repository<AdminNotificationCampaign>;
  protected repositoryReadWrite: Repository<AdminNotificationCampaign>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AdminNotificationCampaign);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AdminNotificationCampaign);
  }

  async create(dto: CreateAdminNotificationCampaignDto): Promise<AdminNotificationCampaign> {
    const row = this.repositoryReadWrite.create({
      audience: dto.audience,
      body: dto.body ?? null,
      category: dto.category,
      created_by_admin_id: dto.created_by_admin_id ?? null,
      link_path: dto.link_path ?? null,
      scheduled_at: dto.scheduled_at ?? null,
      scheduled_job_dedupe_key: dto.scheduled_job_dedupe_key ?? null,
      send_push: dto.send_push,
      status: dto.status ?? AdminNotificationCampaignStatusEnum.Draft,
      title: dto.title,
    });
    return this.repositoryReadWrite.save(row);
  }

  async getByIdText(idText: string): Promise<AdminNotificationCampaign | null> {
    if (idText === '') {
      return null;
    }
    return this.repositoryRead.findOne({ where: { id_text: idText } });
  }

  async listPaginated(
    params: ListAdminNotificationCampaignsParams
  ): Promise<{ rows: AdminNotificationCampaign[]; total: number }> {
    const where: FindOptionsWhere<AdminNotificationCampaign> = {};
    if (params.status !== undefined) {
      where.status = params.status;
    }
    if (params.category !== undefined) {
      where.category = params.category;
    }

    const page = Math.max(1, params.page);
    const limit = Math.max(1, Math.min(params.limit, 100));
    const offset = (page - 1) * limit;

    const [rows, total] = await this.repositoryRead.findAndCount({
      order: {
        created_at: 'DESC',
        id: 'DESC',
      },
      skip: offset,
      take: limit,
      where,
    });

    return { rows, total };
  }

  async updateScheduling(
    id: number,
    params: {
      scheduled_at: Date | null;
      scheduled_job_dedupe_key: string | null;
      status: AdminNotificationCampaignStatusValues;
      last_error?: string | null;
    }
  ): Promise<AdminNotificationCampaign | null> {
    const row = await this.repositoryReadWrite.findOne({ where: { id } });
    if (row === null) {
      return null;
    }

    row.scheduled_at = params.scheduled_at;
    row.scheduled_job_dedupe_key = params.scheduled_job_dedupe_key;
    row.status = params.status;
    row.last_error = params.last_error ?? null;

    return this.repositoryReadWrite.save(row);
  }

  async markSending(id: number): Promise<AdminNotificationCampaign | null> {
    const row = await this.repositoryReadWrite.findOne({ where: { id } });
    if (row === null) {
      return null;
    }

    row.status = AdminNotificationCampaignStatusEnum.Sending;
    row.last_error = null;
    return this.repositoryReadWrite.save(row);
  }

  async markSent(id: number, sentAt: Date): Promise<AdminNotificationCampaign | null> {
    const row = await this.repositoryReadWrite.findOne({ where: { id } });
    if (row === null) {
      return null;
    }

    row.status = AdminNotificationCampaignStatusEnum.Sent;
    row.sent_at = sentAt;
    row.last_error = null;
    return this.repositoryReadWrite.save(row);
  }

  async markCancelled(id: number, reason?: string): Promise<AdminNotificationCampaign | null> {
    const row = await this.repositoryReadWrite.findOne({ where: { id } });
    if (row === null) {
      return null;
    }

    row.status = AdminNotificationCampaignStatusEnum.Cancelled;
    row.cancelled_at = new Date();
    row.last_error = reason ?? null;
    return this.repositoryReadWrite.save(row);
  }

  async markFailed(id: number, reason: string): Promise<AdminNotificationCampaign | null> {
    const row = await this.repositoryReadWrite.findOne({ where: { id } });
    if (row === null) {
      return null;
    }

    row.status = AdminNotificationCampaignStatusEnum.Cancelled;
    row.last_error = reason;
    return this.repositoryReadWrite.save(row);
  }
}
