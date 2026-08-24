import type { Relation } from 'typeorm';
import { Column, Entity, JoinColumn, OneToOne, PrimaryGeneratedColumn } from 'typeorm';

import type { MediaTypePreference } from '@podverse/helpers';
import { DEFAULT_MEDIA_TYPE_PREFERENCE } from '@podverse/helpers';

import type { AccountSettings } from './accountSettings.js';

@Entity()
export class AccountSettingsPlayback {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'account_settings_id', unique: true })
  account_settings_id!: number;

  @OneToOne(
    'AccountSettings',
    (accountSettings: AccountSettings) => accountSettings.account_settings_playback,
    {
      onDelete: 'CASCADE',
    }
  )
  @JoinColumn({ name: 'account_settings_id' })
  account_settings!: Relation<AccountSettings>;

  @Column({
    type: 'varchar',
    name: 'preferred_media_type',
    default: DEFAULT_MEDIA_TYPE_PREFERENCE,
  })
  preferred_media_type!: MediaTypePreference;
}
