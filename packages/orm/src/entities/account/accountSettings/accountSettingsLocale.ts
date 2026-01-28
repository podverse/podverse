import { Entity, PrimaryGeneratedColumn, Column, OneToOne, JoinColumn } from 'typeorm';
import { AccountSettings } from './accountSettings';
import { DATABASE_CONSTANTS } from '@podverse/helpers';

@Entity()
export class AccountSettingsLocale {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'account_settings_id', unique: true })
  account_settings_id!: number;

  @OneToOne(() => AccountSettings, (accountSettings) => accountSettings.account_settings_locale, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'account_settings_id' })
  account_settings!: AccountSettings;

  @Column({ type: 'varchar', length: DATABASE_CONSTANTS.varchar_locale, default: 'en-US' })
  locale!: string;
}
