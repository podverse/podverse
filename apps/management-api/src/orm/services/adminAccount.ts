import { config } from '@management-api/config/index.js';
import { AppDataSourceRead, AppDataSourceReadWrite } from '@management-api/orm/db/index.js';
import { AdminAccount } from '@management-api/orm/entities/adminAccount.js';
import { AdminAccountCredentials } from '@management-api/orm/entities/adminAccountCredentials.js';
import { AdminAccountPermissions } from '@management-api/orm/entities/adminAccountPermissions.js';
import { AdminAccountRoleEnum } from '@management-api/orm/entities/adminAccountRole.js';
import bcrypt from 'bcrypt';
import type { FindOneOptions, Repository } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

type CrudPermissions = {
  feeds_crud?: number;
  feed_takedown_reasons_crud?: number;
  admins_crud?: number;
  stats_crud?: number;
  billing_prices_crud?: number;
  bucket_crud?: number;
  embed_demo_crud?: number;
  notifications_crud?: number;
};

type CreateAdminAccountDto = {
  email?: string;
  username?: string;
  password?: string;
  permissions?: CrudPermissions;
};

type UpdateAdminAccountDto = {
  email?: string | null;
  username?: string | null;
  password?: string;
  permissions?: CrudPermissions;
};

export const ADMIN_ACCOUNT_DUPLICATE_CREDENTIALS_ERROR =
  'Admin account with this email or username already exists';

export const ADMIN_ACCOUNT_MUST_HAVE_IDENTIFIER_ERROR =
  'Admin account must have an email or username';

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
      relations: {
        admin_account_role: true,
        permissions: true,
        admin_account_credentials: true,
      },
    });
  }

  async getByEmail(
    email: string,
    config?: FindOneOptions<AdminAccount>
  ): Promise<AdminAccount | null> {
    const normalized = email.trim().toLowerCase();
    if (normalized.length === 0) {
      return null;
    }
    const credentials = await this.credentialsRepositoryRead.findOne({
      where: { email: normalized },
      relations: {
        admin_account: true,
      },
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
      relations: {
        admin_account_role: true,
        admin_account_credentials: true,
        permissions: true,
      },
      order: { id: 'ASC' },
    });
  }

  async create(dto: CreateAdminAccountDto): Promise<AdminAccount> {
    const emailNorm =
      dto.email !== undefined && dto.email.length > 0 ? dto.email.trim().toLowerCase() : null;
    const usernameNorm =
      dto.username !== undefined && dto.username.length > 0
        ? dto.username.trim().toLowerCase()
        : null;

    if (emailNorm === null && usernameNorm === null) {
      throw new Error(ADMIN_ACCOUNT_MUST_HAVE_IDENTIFIER_ERROR);
    }

    if (emailNorm !== null) {
      const byEmail = await this.credentialsRepositoryRead.findOne({ where: { email: emailNorm } });
      if (byEmail) {
        throw new Error(ADMIN_ACCOUNT_DUPLICATE_CREDENTIALS_ERROR);
      }
    }
    if (usernameNorm !== null) {
      const byUsername = await this.credentialsRepositoryRead.findOne({
        where: { username: usernameNorm },
      });
      if (byUsername) {
        throw new Error(ADMIN_ACCOUNT_DUPLICATE_CREDENTIALS_ERROR);
      }
    }

    const adminAccount = this.repositoryReadWrite.create();
    const savedAccount = await this.repositoryReadWrite.save(adminAccount);

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const passwordPlain = dto.password ?? uuidv4();
    const hashedPassword = await bcrypt.hash(passwordPlain, salt);

    const credentials = this.credentialsRepositoryReadWrite.create({
      admin_account_id: savedAccount.id,
      email: emailNorm,
      username: usernameNorm,
      password: hashedPassword,
    });
    await this.credentialsRepositoryReadWrite.save(credentials);

    const permissions = this.permissionsRepositoryReadWrite.create({
      admin_account_id: savedAccount.id,
      feedsCrud: dto.permissions?.feeds_crud ?? 0,
      feedTakedownReasonsCrud: dto.permissions?.feed_takedown_reasons_crud ?? 0,
      adminsCrud: dto.permissions?.admins_crud ?? 0,
      statsCrud: dto.permissions?.stats_crud ?? 0,
      billingPricesCrud: dto.permissions?.billing_prices_crud ?? 0,
      bucketCrud: dto.permissions?.bucket_crud ?? 0,
      embedDemoCrud: dto.permissions?.embed_demo_crud ?? 0,
      notificationsCrud: dto.permissions?.notifications_crud ?? 0,
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

    if (dto.email !== undefined || dto.username !== undefined || dto.password !== undefined) {
      const credentials = await this.credentialsRepositoryReadWrite.findOne({
        where: { admin_account_id: id },
      });
      if (!credentials) {
        throw new Error('Admin credentials not found');
      }

      let nextEmail = credentials.email;
      let nextUsername = credentials.username;

      if (dto.email !== undefined) {
        nextEmail = dto.email;
      }
      if (dto.username !== undefined) {
        nextUsername = dto.username;
      }

      if (nextEmail === null && nextUsername === null) {
        throw new Error(ADMIN_ACCOUNT_MUST_HAVE_IDENTIFIER_ERROR);
      }

      if (dto.email !== undefined && nextEmail !== null) {
        const existingWithEmail = await this.credentialsRepositoryRead.findOne({
          where: { email: nextEmail },
        });
        if (existingWithEmail && existingWithEmail.admin_account_id !== id) {
          throw new Error(ADMIN_ACCOUNT_DUPLICATE_CREDENTIALS_ERROR);
        }
      }
      if (dto.username !== undefined && nextUsername !== null) {
        const existingWithUsername = await this.credentialsRepositoryRead.findOne({
          where: { username: nextUsername },
        });
        if (existingWithUsername && existingWithUsername.admin_account_id !== id) {
          throw new Error(ADMIN_ACCOUNT_DUPLICATE_CREDENTIALS_ERROR);
        }
      }

      credentials.email = nextEmail;
      credentials.username = nextUsername;

      if (dto.password !== undefined) {
        const saltRounds = 10;
        const salt = await bcrypt.genSalt(saltRounds);
        credentials.password = await bcrypt.hash(dto.password, salt);
        await this.clearSetPasswordToken(id);
      }
      await this.credentialsRepositoryReadWrite.save(credentials);
    }

    if (dto.permissions !== undefined) {
      if (adminAccount.permissions) {
        if (dto.permissions.feeds_crud !== undefined) {
          adminAccount.permissions.feedsCrud = dto.permissions.feeds_crud;
        }
        if (dto.permissions.feed_takedown_reasons_crud !== undefined) {
          adminAccount.permissions.feedTakedownReasonsCrud =
            dto.permissions.feed_takedown_reasons_crud;
        }
        if (dto.permissions.admins_crud !== undefined) {
          adminAccount.permissions.adminsCrud = dto.permissions.admins_crud;
        }
        if (dto.permissions.stats_crud !== undefined) {
          adminAccount.permissions.statsCrud = dto.permissions.stats_crud;
        }
        if (dto.permissions.billing_prices_crud !== undefined) {
          adminAccount.permissions.billingPricesCrud = dto.permissions.billing_prices_crud;
        }
        if (dto.permissions.bucket_crud !== undefined) {
          adminAccount.permissions.bucketCrud = dto.permissions.bucket_crud;
        }
        if (dto.permissions.embed_demo_crud !== undefined) {
          adminAccount.permissions.embedDemoCrud = dto.permissions.embed_demo_crud;
        }
        if (dto.permissions.notifications_crud !== undefined) {
          adminAccount.permissions.notificationsCrud = dto.permissions.notifications_crud;
        }
        await this.permissionsRepositoryReadWrite.save(adminAccount.permissions);
      } else {
        const permissions = this.permissionsRepositoryReadWrite.create({
          admin_account_id: id,
          feedsCrud: dto.permissions.feeds_crud ?? 0,
          feedTakedownReasonsCrud: dto.permissions.feed_takedown_reasons_crud ?? 0,
          adminsCrud: dto.permissions.admins_crud ?? 0,
          statsCrud: dto.permissions.stats_crud ?? 0,
          billingPricesCrud: dto.permissions.billing_prices_crud ?? 0,
          bucketCrud: dto.permissions.bucket_crud ?? 0,
          embedDemoCrud: dto.permissions.embed_demo_crud ?? 0,
          notificationsCrud: dto.permissions.notifications_crud ?? 0,
        });
        await this.permissionsRepositoryReadWrite.save(permissions);
      }
    }

    return this.getWithRoleAndPermissions(id) as Promise<AdminAccount>;
  }

  async delete(id: number): Promise<void> {
    const adminAccount = await this.repositoryReadWrite.findOne({
      where: { id },
      relations: {
        admin_account_role: true,
      },
    });

    if (!adminAccount) {
      throw new Error('Admin account not found');
    }

    if (adminAccount.admin_account_role.role === AdminAccountRoleEnum.SUPERUSER) {
      throw new Error('Superuser accounts cannot be deleted');
    }

    await this.repositoryReadWrite.remove(adminAccount);
  }

  async verifyPassword(loginIdentifier: string, password: string): Promise<AdminAccount | null> {
    const trimmed = loginIdentifier.trim();
    if (trimmed.length === 0) {
      return null;
    }
    const idLower = trimmed.toLowerCase();

    const credentials = await this.credentialsRepositoryRead
      .createQueryBuilder('c')
      .innerJoinAndSelect('c.admin_account', 'admin_account')
      .where(
        '(c.email IS NOT NULL AND c.email = :idLower) OR (c.username IS NOT NULL AND c.username = :idLower)',
        { idLower }
      )
      .getOne();

    if (!credentials) {
      return null;
    }

    const isMatch = await bcrypt.compare(password, credentials.password);
    if (!isMatch) {
      return null;
    }

    return credentials.admin_account;
  }

  /** Removes invite/set-password token rows after the password is set explicitly. */
  async clearSetPasswordToken(adminAccountId: number): Promise<void> {
    await AppDataSourceReadWrite.query(
      `DELETE FROM admin_account_set_password WHERE admin_account_id = $1`,
      [adminAccountId]
    );
  }

  /**
   * Applies a new password from a valid invite/set-password token and clears the token row.
   */
  async completeSetPasswordFromToken(token: string, plainPassword: string): Promise<void> {
    const rows = (await AppDataSourceRead.query(
      `SELECT admin_account_id, set_password_token_expires_at
       FROM admin_account_set_password
       WHERE set_password_token = $1`,
      [token]
    )) as { admin_account_id: number; set_password_token_expires_at: Date }[];

    const [first] = rows;
    if (first === undefined) {
      throw new Error('Invalid or expired set-password token');
    }

    if (new Date(first.set_password_token_expires_at) < new Date()) {
      throw new Error('Invalid or expired set-password token');
    }

    const adminAccountId = first.admin_account_id;
    const credentials = await this.credentialsRepositoryReadWrite.findOne({
      where: { admin_account_id: adminAccountId },
    });
    if (!credentials) {
      throw new Error('Admin credentials not found');
    }

    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    credentials.password = await bcrypt.hash(plainPassword, salt);
    await this.credentialsRepositoryReadWrite.save(credentials);
    await this.clearSetPasswordToken(adminAccountId);
  }

  private getInviteTtlMs(): number {
    return config.setUserPasswordExpiration * 1000;
  }

  /** Returns active invite token row if present and not expired. */
  async getActiveInviteToken(adminAccountId: number): Promise<{
    token: string;
    expires_at: Date;
  } | null> {
    const rows = (await AppDataSourceRead.query(
      `SELECT set_password_token, set_password_token_expires_at
       FROM admin_account_set_password
       WHERE admin_account_id = $1`,
      [adminAccountId]
    )) as { set_password_token: string; set_password_token_expires_at: Date }[];

    const [first] = rows;
    if (first === undefined) {
      return null;
    }

    const expiresAt = new Date(first.set_password_token_expires_at);
    if (expiresAt < new Date()) {
      return null;
    }

    return { token: first.set_password_token, expires_at: expiresAt };
  }

  /** Creates or replaces the invite/set-password token for an admin account. */
  async upsertInviteToken(adminAccountId: number): Promise<{ token: string; expires_at: Date }> {
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + this.getInviteTtlMs());

    await AppDataSourceReadWrite.query(
      `INSERT INTO admin_account_set_password (admin_account_id, set_password_token, set_password_token_expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (admin_account_id) DO UPDATE SET
         set_password_token = EXCLUDED.set_password_token,
         set_password_token_expires_at = EXCLUDED.set_password_token_expires_at`,
      [adminAccountId, token, expiresAt]
    );

    return { token, expires_at: expiresAt };
  }
}
