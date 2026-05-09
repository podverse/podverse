import type { DataSource, Repository } from 'typeorm';

import { ExtensionSetting } from '../entities/ExtensionSetting.js';

export class ExtensionSettingsService {
  static repo(ds: DataSource): Repository<ExtensionSetting> {
    return ds.getRepository(ExtensionSetting);
  }

  static async findById(ds: DataSource, id: string): Promise<ExtensionSetting | null> {
    return this.repo(ds).findOneBy({ id });
  }

  static async findAll(ds: DataSource): Promise<ExtensionSetting[]> {
    return this.repo(ds).find({ order: { id: 'ASC' } });
  }

  static async upsert(
    ds: DataSource,
    input: {
      id: string;
      enabled: boolean;
      config: Record<string, unknown>;
      updatedByAdminId: number | null;
    }
  ): Promise<ExtensionSetting> {
    const repo = this.repo(ds);
    const existing = await repo.findOneBy({ id: input.id });
    if (existing === null) {
      const created = repo.create({
        id: input.id,
        enabled: input.enabled,
        config: input.config,
        updatedByAdminId: input.updatedByAdminId,
      });
      return repo.save(created);
    }
    existing.enabled = input.enabled;
    existing.config = input.config;
    existing.updatedByAdminId = input.updatedByAdminId;
    return repo.save(existing);
  }

  static async deleteById(ds: DataSource, id: string): Promise<void> {
    await this.repo(ds).delete({ id });
  }
}
