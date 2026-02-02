import type { EntityManager } from 'typeorm';
import type { Account } from '@orm/entities/account/account.js';
import { AccountProfile } from '@orm/entities/account/accountProfile.js';
import { BaseOneService } from '@orm/services/base/baseOneService.js';

export type AccountProfileDto = {
  display_name?: string | null;
  bio?: string | null;
};

export class AccountProfileService extends BaseOneService<AccountProfile, 'account'> {
  constructor(transactionalEntityManager?: EntityManager) {
    super(AccountProfile, 'account', transactionalEntityManager);
  }

  async update(account: Account, dto: AccountProfileDto): Promise<AccountProfile> {
    // Trim display_name and set to null if empty/whitespace
    let display_name: string | null = dto.display_name ?? null;
    if (display_name !== null && typeof display_name === 'string') {
      display_name = display_name.trim();
      if (display_name === '') {
        display_name = null;
      }
    }

    // Trim bio
    let bio: string | null = dto.bio ?? null;
    if (bio !== null && typeof bio === 'string') {
      bio = bio ? bio.trim() : null;
    }

    const finalDto = {
      display_name,
      bio,
    };

    return super._update(account, finalDto);
  }
}
