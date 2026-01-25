import { Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToOne } from 'typeorm';
import { Account } from '@orm/entities/account/account';
import { AccountSettingsLocale } from './accountSettingsLocale';
import { AccountSettingsNotification } from './accountSettingsNotification';

@Entity()
export class AccountSettings {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ name: 'account_id', unique: true })
  account_id!: number;

  @OneToOne(() => Account, account => account.account_settings, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'account_id' })
  account!: Account;

  @OneToOne(() => AccountSettingsLocale, accountSettingsLocale => accountSettingsLocale.account_settings, { cascade: ['insert'] })
  account_settings_locale!: AccountSettingsLocale;

  @OneToOne(() => AccountSettingsNotification, accountSettingsNotification => accountSettingsNotification.account_settings, { cascade: ['insert'] })
  account_settings_notification!: AccountSettingsNotification;
}
