import { AppDataSourceRead, AppDataSourceReadWrite } from '@orm/db/index.js';
import { AccountSettings } from '@orm/entities/account/accountSettings/accountSettings.js';
import { AccountSettingsPlayback } from '@orm/entities/account/accountSettings/accountSettingsPlayback.js';
import type { Repository } from 'typeorm';

import type { MediaTypePreference } from '@podverse/helpers';

type UpdateDto = {
  account_id: number;
  preferred_media_type: MediaTypePreference;
};

export class AccountSettingsPlaybackService {
  protected repositoryRead: Repository<AccountSettingsPlayback>;
  protected repositoryReadWrite: Repository<AccountSettingsPlayback>;

  constructor() {
    this.repositoryRead = AppDataSourceRead.getRepository(AccountSettingsPlayback);
    this.repositoryReadWrite = AppDataSourceReadWrite.getRepository(AccountSettingsPlayback);
  }

  async update(dto: UpdateDto): Promise<AccountSettingsPlayback> {
    const accountSettingsRepo = AppDataSourceRead.getRepository(AccountSettings);
    const accountSettings = await accountSettingsRepo.findOne({
      where: { account_id: dto.account_id },
      relations: {
        account_settings_playback: true,
      },
    });

    if (!accountSettings) {
      throw new Error('AccountSettings not found for account');
    }

    if (!accountSettings.account_settings_playback) {
      const obj = this.repositoryReadWrite.create({
        account_settings_id: accountSettings.id,
        preferred_media_type: dto.preferred_media_type,
      });
      return this.repositoryReadWrite.save(obj);
    }

    const playbackSettings = accountSettings.account_settings_playback;
    playbackSettings.preferred_media_type = dto.preferred_media_type;
    return this.repositoryReadWrite.save(playbackSettings);
  }
}
