import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { AccountTermsAcceptance } from '@orm/entities/account/accountTermsAcceptance.js';
import type { Repository } from 'typeorm';

export class AccountTermsAcceptanceService {
  protected repositoryRead: Repository<AccountTermsAcceptance>;
  protected repositoryReadWrite: Repository<AccountTermsAcceptance>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AccountTermsAcceptance);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AccountTermsAcceptance);
  }

  async getByAccountId(accountId: number): Promise<AccountTermsAcceptance | null> {
    return this.repositoryRead.findOne({ where: { account_id: accountId } });
  }

  async upsert(accountId: number, termsVersion: string): Promise<AccountTermsAcceptance> {
    const existing = await this.repositoryReadWrite.findOne({ where: { account_id: accountId } });
    if (existing !== null) {
      existing.terms_version = termsVersion;
      existing.accepted_at = new Date();
      return this.repositoryReadWrite.save(existing);
    }

    const row = this.repositoryReadWrite.create({
      account_id: accountId,
      terms_version: termsVersion,
      accepted_at: new Date(),
    });
    return this.repositoryReadWrite.save(row);
  }
}
