import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  BeforeInsert,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { AccountCredentials } from '@orm/entities/account/accountCredentials';
import { SharableStatus } from '@orm/entities/sharableStatus';
import { AccountAppStorePurchase } from './accountAppStorePurchase';
import { AccountFCMDevice } from './accountFCMDevice';
import { AccountFollowingAccount } from './accountFollowingAccount';
import { AccountFollowingAddByRSSChannel } from './accountFollowingAddByRSSChannel';
import { AccountFollowingChannel } from './accountFollowingChannel';
import { AccountFollowingPlaylist } from './accountFollowingPlaylist';
import { AccountGooglePlayPurchase } from './accountGooglePlayPurchase';
import { AccountMembershipStatus } from './accountMembershipStatus';
import { AccountNotificationChannel } from './accountNotificationChannel';
import { AccountPayPalOrder } from './accountPayPalOrder';
import { AccountProfile } from './accountProfile';
import { AccountResetPassword } from './accountResetPassword';
import { AccountUPDevice } from './accountUPDevice';
import { AccountVerification } from './accountVerification';
import { generateRandomIdText } from '@orm/lib/nanoid';
import { AccountSettings } from './accountSettings/accountSettings';
import { AccountWebPushDevice } from './accountWebPushDevice';

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  id_text!: string;

  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  @ManyToOne(() => SharableStatus, (sharableStatus) => sharableStatus.id)
  @JoinColumn({ name: 'sharable_status_id' })
  sharable_status!: SharableStatus;

  @OneToMany(
    () => AccountAppStorePurchase,
    (accountAppStorePurchase) => accountAppStorePurchase.account
  )
  account_app_store_purchases!: AccountAppStorePurchase[];

  @OneToOne(() => AccountCredentials, (accountCredentials) => accountCredentials.account)
  account_credentials!: AccountCredentials;

  @OneToMany(() => AccountFCMDevice, (accountFCMDevice) => accountFCMDevice.account)
  account_fcm_devices!: AccountFCMDevice[];

  @OneToMany(
    () => AccountFollowingAccount,
    (accountFollowingAccount) => accountFollowingAccount.account
  )
  account_following_accounts!: AccountFollowingAccount[];

  @OneToMany(
    () => AccountFollowingAddByRSSChannel,
    (AccountFollowingAddByRSSChannel) => AccountFollowingAddByRSSChannel.account
  )
  account_following_add_by_rss_channels!: AccountFollowingAddByRSSChannel[];

  @OneToMany(
    () => AccountFollowingChannel,
    (accountFollowingChannel) => accountFollowingChannel.account
  )
  account_following_channels!: AccountFollowingChannel[];

  @OneToMany(
    () => AccountFollowingPlaylist,
    (accountFollowingPlaylist) => accountFollowingPlaylist.account
  )
  account_following_playlists!: AccountFollowingPlaylist[];

  @OneToMany(
    () => AccountGooglePlayPurchase,
    (accountGooglePlayPurchase) => accountGooglePlayPurchase.account
  )
  account_google_play_purchases!: AccountGooglePlayPurchase[];

  @OneToOne(
    () => AccountMembershipStatus,
    (accountMembershipStatus) => accountMembershipStatus.account
  )
  account_membership_status!: AccountMembershipStatus;

  @OneToMany(
    () => AccountNotificationChannel,
    (accountNotificationChannel) => accountNotificationChannel.account
  )
  account_notification_channels!: AccountNotificationChannel[];

  @OneToMany(() => AccountPayPalOrder, (accountPayPalOrder) => accountPayPalOrder.account)
  account_paypal_orders!: AccountPayPalOrder[];

  @OneToOne(() => AccountProfile, (accountProfile) => accountProfile.account)
  account_profile!: AccountProfile;

  @OneToOne(() => AccountResetPassword, (accountResetPassword) => accountResetPassword.account)
  account_reset_password!: AccountResetPassword;

  @OneToOne(() => AccountSettings, (accountSettings) => accountSettings.account, {
    cascade: ['insert'],
  })
  account_settings!: AccountSettings;

  @OneToMany(() => AccountUPDevice, (accountUPDevice) => accountUPDevice.account)
  account_up_devices!: AccountUPDevice[];

  @OneToMany(() => AccountWebPushDevice, (accountWebPushDevice) => accountWebPushDevice.account)
  account_web_push_devices!: AccountWebPushDevice[];

  @OneToOne(() => AccountVerification, (accountVerification) => accountVerification.account)
  account_verification!: AccountVerification;

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }
}
