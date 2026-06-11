import { AppDataSourceRead, AppDataSourceReadWrite } from '@management-api/orm/db/index.js';
import { ManagementAdminRole } from '@management-api/orm/entities/managementAdminRole.js';
import type { Repository } from 'typeorm';

export type CreateManagementAdminRoleData = {
  name: string;
  feedsCrud: number;
  feedTakedownReasonsCrud: number;
  adminsCrud: number;
  statsCrud: number;
  billingPricesCrud: number;
  bucketCrud: number;
  embedDemoCrud: number;
};

export type UpdateManagementAdminRoleData = Partial<CreateManagementAdminRoleData>;

export class ManagementAdminRoleService {
  protected repositoryRead: Repository<ManagementAdminRole>;
  protected repositoryReadWrite: Repository<ManagementAdminRole>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(ManagementAdminRole);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(ManagementAdminRole);
  }

  async listAll(): Promise<ManagementAdminRole[]> {
    return this.repositoryRead.find({ order: { name: 'ASC' } });
  }

  async findById(id: string): Promise<ManagementAdminRole | null> {
    if (id === '') {
      return null;
    }
    return this.repositoryRead.findOne({ where: { id } });
  }

  async create(data: CreateManagementAdminRoleData): Promise<ManagementAdminRole> {
    const row = this.repositoryReadWrite.create({
      name: data.name,
      feedsCrud: data.feedsCrud,
      feedTakedownReasonsCrud: data.feedTakedownReasonsCrud,
      adminsCrud: data.adminsCrud,
      statsCrud: data.statsCrud,
      billingPricesCrud: data.billingPricesCrud,
      bucketCrud: data.bucketCrud,
      embedDemoCrud: data.embedDemoCrud,
    });
    return this.repositoryReadWrite.save(row);
  }

  async update(
    id: string,
    data: UpdateManagementAdminRoleData
  ): Promise<ManagementAdminRole | null> {
    const existing = await this.findById(id);
    if (existing === null) {
      return null;
    }
    if (data.name !== undefined) {
      existing.name = data.name.trim();
    }
    if (data.feedsCrud !== undefined) {
      existing.feedsCrud = data.feedsCrud;
    }
    if (data.feedTakedownReasonsCrud !== undefined) {
      existing.feedTakedownReasonsCrud = data.feedTakedownReasonsCrud;
    }
    if (data.adminsCrud !== undefined) {
      existing.adminsCrud = data.adminsCrud;
    }
    if (data.statsCrud !== undefined) {
      existing.statsCrud = data.statsCrud;
    }
    if (data.billingPricesCrud !== undefined) {
      existing.billingPricesCrud = data.billingPricesCrud;
    }
    if (data.bucketCrud !== undefined) {
      existing.bucketCrud = data.bucketCrud;
    }
    if (data.embedDemoCrud !== undefined) {
      existing.embedDemoCrud = data.embedDemoCrud;
    }
    return this.repositoryReadWrite.save(existing);
  }

  async delete(id: string): Promise<void> {
    await this.repositoryReadWrite.delete(id);
  }
}
