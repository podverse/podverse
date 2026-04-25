import { AppDataSourceRead, AppDataSourceReadWrite } from '@mgmt-api/orm/db/index.js';
import { AdminAccount } from '@mgmt-api/orm/entities/adminAccount.js';
import { AdminAccountCredentials } from '@mgmt-api/orm/entities/adminAccountCredentials.js';
import { AdminAccountPermissions } from '@mgmt-api/orm/entities/adminAccountPermissions.js';
import { AdminAccountRoleEnum } from '@mgmt-api/orm/entities/adminAccountRole.js';
import bcrypt from 'bcrypt';
import type { FindOneOptions, Repository } from 'typeorm';

type CrudPermissions = {
  feeds_crud?: number;
  feed_flag_statuses_crud?: number;
  feed_flag_status_reasons_crud?: number;
  admins_crud?: number;
  stats_crud?: number;
};

type CreateAdminAccountDto = {
  email: string;
  password: string;
  permissions?: CrudPermissions;
};

type UpdateAdminAccountDto = {
  email?: string;
  password?: string;
  permissions?: CrudPermissions;
};

export class AdminAccountService {
  protected repositoryRead: Repository<AdminAccount>;
  protected repositoryReadWrite: Repository<AdminAccount>;
  protected credentialsRepositoryRead: Repository<AdminAccountCredentials>;
  protected credentialsRepositoryReadWrite: Repository<AdminAccountCredentials>;
  protected permissionsRepositoryRead: Repository<AdminAccountPermissions>;
  protected permissionsRepositoryReadWrite: Repository<AdminAccountPermissions>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AdminAccount);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AdminAccount);
    this.credentialsRepositoryRead = AppDataSourceRead.getRepository(AdminAccountCredentials);
    this.credentialsRepositoryReadWrite =
      AppDataSourceReadWrite.getRepository(AdminAccountCredentials);
    this.permissionsRepositoryRead = AppDataSourceRead.getRepository(AdminAccountPermissions);
    this.permissionsRepositoryReadWrite =
      AppDataSourceReadWrite.getRepository(AdminAccountPermissions);
  }

  async get(id: number, config?: FindOneOptions<AdminAccount>): Promise<AdminAccount | null> {
    if (!id) {
      return null;
    }
    return this.repositoryRead.findOne({ where: { id }, ...config });
  }

  async getWithRoleAndPermissions(id: number): Promise<AdminAccount | null> {
    if (!id) {
      return null;
    }
    return this.repositoryRead.findOne({
      where: { id },
      relations: ['admin_account_role', 'permissions', 'admin_account_credentials'],
    });
  }

  async getByEmail(
    email: string,
    config?: FindOneOptions<AdminAccount>
  ): Promise<AdminAccount | null> {
    const credentials = await this.credentialsRepositoryRead.findOne({
      where: { email },
      relations: ['admin_account'],
    });

    if (!credentials) {
      return null;
    }

    return this.get(credentials.admin_account_id, config);
  }

  async getByIdText(
    id_text: string,
    config?: FindOneOptions<AdminAccount>
  ): Promise<AdminAccount | null> {
    if (!id_text) {
      return null;
    }
    return this.repositoryRead.findOne({ where: { id_text }, ...config });
  }

  async list(): Promise<AdminAccount[]> {
    return this.repositoryRead.find({
      relations: ['admin_account_role', 'admin_account_credentials', 'permissions'],
      order: { id: 'ASC' },
    });
  }

  async create(dto: CreateAdminAccountDto): Promise<AdminAccount> {
    const existingCredentials = await this.credentialsRepositoryRead.findOne({
      where: { email: dto.email },
    });

    if (existingCredentials) {
      throw new Error('Admin account with this email already exists');
    }

    const adminAccount = this.repositoryReadWrite.create();
    const savedAccount = await this.repositoryReadWrite.save(adminAccount);

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    const credentials = this.credentialsRepositoryReadWrite.create({
      admin_account_id: savedAccount.id,
      email: dto.email,
      password: hashedPassword,
    });
    await this.credentialsRepositoryReadWrite.save(credentials);

    const permissions = this.permissionsRepositoryReadWrite.create({
      admin_account_id: savedAccount.id,
      feedsCrud: dto.permissions?.feeds_crud ?? 0,
      feedFlagStatusesCrud: dto.permissions?.feed_flag_statuses_crud ?? 0,
      feedFlagStatusReasonsCrud: dto.permissions?.feed_flag_status_reasons_crud ?? 0,
      adminsCrud: dto.permissions?.admins_crud ?? 0,
      statsCrud: dto.permissions?.stats_crud ?? 0,
    });
    await this.permissionsRepositoryReadWrite.save(permissions);

    return this.getWithRoleAndPermissions(savedAccount.id) as Promise<AdminAccount>;
  }

  async update(id: number, dto: UpdateAdminAccountDto): Promise<AdminAccount> {
    const adminAccount = await this.getWithRoleAndPermissions(id);
    if (!adminAccount) {
      throw new Error('Admin account not found');
    }

    if (adminAccount.admin_account_role.role === AdminAccountRoleEnum.SUPERUSER) {
      throw new Error('Superuser accounts cannot be modified via API');
    }

    if (dto.email !== undefined || dto.password !== undefined) {
      const credentials = await this.credentialsRepositoryReadWrite.findOne({
        where: { admin_account_id: id },
      });
      if (!credentials) {
        throw new Error('Admin credentials not found');
      }
      if (dto.email !== undefined) {
        const existingWithEmail = await this.credentialsRepositoryRead.findOne({
          where: { email: dto.email },
        });
        if (existingWithEmail && existingWithEmail.admin_account_id !== id) {
          throw new Error('Admin account with this email already exists');
        }
        credentials.email = dto.email;
      }
      if (dto.password !== undefined) {
        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        credentials.password = await bcrypt.hash(dto.password, salt);
      }
      await this.credentialsRepositoryReadWrite.save(credentials);
    }

    if (dto.permissions !== undefined) {
      if (adminAccount.permissions) {
        if (dto.permissions.feeds_crud !== undefined) {
          adminAccount.permissions.feedsCrud = dto.permissions.feeds_crud;
        }
        if (dto.permissions.feed_flag_statuses_crud !== undefined) {
          adminAccount.permissions.feedFlagStatusesCrud = dto.permissions.feed_flag_statuses_crud;
        }
        if (dto.permissions.feed_flag_status_reasons_crud !== undefined) {
          adminAccount.permissions.feedFlagStatusReasonsCrud =
            dto.permissions.feed_flag_status_reasons_crud;
        }
        if (dto.permissions.admins_crud !== undefined) {
          adminAccount.permissions.adminsCrud = dto.permissions.admins_crud;
        }
        if (dto.permissions.stats_crud !== undefined) {
          adminAccount.permissions.statsCrud = dto.permissions.stats_crud;
        }
        await this.permissionsRepositoryReadWrite.save(adminAccount.permissions);
      } else {
        const permissions = this.permissionsRepositoryReadWrite.create({
          admin_account_id: id,
          feedsCrud: dto.permissions.feeds_crud ?? 0,
          feedFlagStatusesCrud: dto.permissions.feed_flag_statuses_crud ?? 0,
          feedFlagStatusReasonsCrud: dto.permissions.feed_flag_status_reasons_crud ?? 0,
          adminsCrud: dto.permissions.admins_crud ?? 0,
          statsCrud: dto.permissions.stats_crud ?? 0,
        });
        await this.permissionsRepositoryReadWrite.save(permissions);
      }
    }

    return this.getWithRoleAndPermissions(id) as Promise<AdminAccount>;
  }

  async delete(id: number): Promise<void> {
    const adminAccount = await this.repositoryReadWrite.findOne({
      where: { id },
      relations: ['admin_account_role'],
    });

    if (!adminAccount) {
      throw new Error('Admin account not found');
    }

    if (adminAccount.admin_account_role.role === AdminAccountRoleEnum.SUPERUSER) {
      throw new Error('Superuser accounts cannot be deleted');
    }

    await this.repositoryReadWrite.remove(adminAccount);
  }

  async verifyPassword(email: string, password: string): Promise<AdminAccount | null> {
    const credentials = await this.credentialsRepositoryRead.findOne({
      where: { email },
      relations: ['admin_account'],
    });

    if (!credentials) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, credentials.password);
    if (!isMatch) {
      return null;
    }

    return credentials.admin_account;
  }
}
