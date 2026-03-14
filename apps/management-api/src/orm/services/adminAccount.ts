import { AppDataSourceRead, AppDataSourceReadWrite } from '@mgmt-api/orm/db/index.js';
import { AdminAccount } from '@mgmt-api/orm/entities/adminAccount.js';
import { AdminAccountCredentials } from '@mgmt-api/orm/entities/adminAccountCredentials.js';
import bcrypt from 'bcrypt';
import type { FindOneOptions, Repository } from 'typeorm';

type CreateAdminAccountDto = {
  email: string;
  password: string;
};

export class AdminAccountService {
  protected repositoryRead: Repository<AdminAccount>;
  protected repositoryReadWrite: Repository<AdminAccount>;
  protected credentialsRepositoryRead: Repository<AdminAccountCredentials>;
  protected credentialsRepositoryReadWrite: Repository<AdminAccountCredentials>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AdminAccount);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AdminAccount);
    this.credentialsRepositoryRead = AppDataSourceRead.getRepository(AdminAccountCredentials);
    this.credentialsRepositoryReadWrite =
      AppDataSourceReadWrite.getRepository(AdminAccountCredentials);
  }

  async get(id: number, config?: FindOneOptions<AdminAccount>): Promise<AdminAccount | null> {
    if (!id) {
      return null;
    }
    return this.repositoryRead.findOne({ where: { id }, ...config });
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

  async create(dto: CreateAdminAccountDto): Promise<AdminAccount> {
    // Check if email already exists
    const existingCredentials = await this.credentialsRepositoryRead.findOne({
      where: { email: dto.email },
    });

    if (existingCredentials) {
      throw new Error('Admin account with this email already exists');
    }

    // Create the admin account
    const adminAccount = this.repositoryReadWrite.create();
    const savedAccount = await this.repositoryReadWrite.save(adminAccount);

    // Hash the password using bcrypt with saltRounds=10 and genSalt (matching podverse-orm pattern)
    const saltRounds = 10;
    const salt = await bcrypt.genSalt(saltRounds);
    const hashedPassword = await bcrypt.hash(dto.password, salt);

    // Create the credentials
    const credentials = this.credentialsRepositoryReadWrite.create({
      admin_account_id: savedAccount.id,
      email: dto.email,
      password: hashedPassword,
    });
    await this.credentialsRepositoryReadWrite.save(credentials);

    return savedAccount;
  }

  async delete(id: number): Promise<void> {
    const adminAccount = await this.repositoryReadWrite.findOne({ where: { id } });

    if (!adminAccount) {
      throw new Error('Admin account not found');
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
