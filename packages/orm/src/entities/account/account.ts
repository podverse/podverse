import type { AccountCredentials } from '@orm/entities/account/accountCredentials.js';
import type { SharableStatus } from '@orm/entities/sharableStatus.js';
import { generateRandomIdText } from '@orm/lib/nanoid.js';
import type { Relation } from 'typeorm';
import {
  BeforeInsert,
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';

import type { AccountAppStorePurchase } from './accountAppStorePurchase.js';
import type { AccountFCMDevice } from './accountFCMDevice.js';
import type { AccountFollowingAccount } from './accountFollowingAccount.js';
import type { AccountFollowingAddByRSSChannel } from './accountFollowingAddByRSSChannel.js';
import type { AccountFollowingChannel } from './accountFollowingChannel.js';
import type { AccountFollowingPlaylist } from './accountFollowingPlaylist.js';
import type { AccountGooglePlayPurchase } from './accountGooglePlayPurchase.js';
import type { AccountMembershipStatus } from './accountMembershipStatus.js';
import type { AccountNotificationChannel } from './accountNotificationChannel.js';
import type { AccountPayPalOrder } from './accountPayPalOrder.js';
import type { AccountProfile } from './accountProfile.js';
import type { AccountResetPassword } from './accountResetPassword.js';
import type { AccountSettings } from './accountSettings/accountSettings.js';
import type { AccountUPDevice } from './accountUPDevice.js';
import type { AccountVerification } from './accountVerification.js';
import type { AccountWebPushDevice } from './accountWebPushDevice.js';

@Entity()
export class Account {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', unique: true })
  id_text!: string;

  @Column({ type: 'boolean', default: false })
  verified!: boolean;

  @ManyToOne('SharableStatus', (sharableStatus: SharableStatus) => sharableStatus.id)
  @JoinColumn({ name: 'sharable_status_id' })
  sharable_status!: Relation<SharableStatus>;

  @OneToMany(
    'AccountAppStorePurchase',
    (accountAppStorePurchase: AccountAppStorePurchase) => accountAppStorePurchase.account
  )
  account_app_store_purchases!: AccountAppStorePurchase[];

  @OneToOne(
    'AccountCredentials',
    (accountCredentials: AccountCredentials) => accountCredentials.account
  )
  account_credentials!: Relation<AccountCredentials>;

  @OneToMany('AccountFCMDevice', (accountFCMDevice: AccountFCMDevice) => accountFCMDevice.account)
  account_fcm_devices!: AccountFCMDevice[];

  @OneToMany(
    'AccountFollowingAccount',
    (accountFollowingAccount: AccountFollowingAccount) => accountFollowingAccount.account
  )
  account_following_accounts!: AccountFollowingAccount[];

  @OneToMany(
    'AccountFollowingAddByRSSChannel',
    (accountFollowingAddByRSSChannel: AccountFollowingAddByRSSChannel) =>
      accountFollowingAddByRSSChannel.account
  )
  account_following_add_by_rss_channels!: AccountFollowingAddByRSSChannel[];

  @OneToMany(
    'AccountFollowingChannel',
    (accountFollowingChannel: AccountFollowingChannel) => accountFollowingChannel.account
  )
  account_following_channels!: AccountFollowingChannel[];

  @OneToMany(
    'AccountFollowingPlaylist',
    (accountFollowingPlaylist: AccountFollowingPlaylist) => accountFollowingPlaylist.account
  )
  account_following_playlists!: AccountFollowingPlaylist[];

  @OneToMany(
    'AccountGooglePlayPurchase',
    (accountGooglePlayPurchase: AccountGooglePlayPurchase) => accountGooglePlayPurchase.account
  )
  account_google_play_purchases!: AccountGooglePlayPurchase[];

  @OneToOne(
    'AccountMembershipStatus',
    (accountMembershipStatus: AccountMembershipStatus) => accountMembershipStatus.account
  )
  account_membership_status!: AccountMembershipStatus;

  @OneToMany(
    'AccountNotificationChannel',
    (accountNotificationChannel: AccountNotificationChannel) => accountNotificationChannel.account
  )
  account_notification_channels!: AccountNotificationChannel[];

  @OneToMany(
    'AccountPayPalOrder',
    (accountPayPalOrder: AccountPayPalOrder) => accountPayPalOrder.account
  )
  account_paypal_orders!: AccountPayPalOrder[];

  @OneToOne('AccountProfile', (accountProfile: AccountProfile) => accountProfile.account)
  account_profile!: AccountProfile;

  @OneToOne(
    'AccountResetPassword',
    (accountResetPassword: AccountResetPassword) => accountResetPassword.account
  )
  account_reset_password!: AccountResetPassword;

  @OneToOne('AccountSettings', (accountSettings: AccountSettings) => accountSettings.account, {
    cascade: ['insert'],
  })
  account_settings!: AccountSettings;

  @OneToMany('AccountUPDevice', (accountUPDevice: AccountUPDevice) => accountUPDevice.account)
  account_up_devices!: AccountUPDevice[];

  @OneToMany(
    'AccountWebPushDevice',
    (accountWebPushDevice: AccountWebPushDevice) => accountWebPushDevice.account
  )
  account_web_push_devices!: AccountWebPushDevice[];

  @OneToOne(
    'AccountVerification',
    (accountVerification: AccountVerification) => accountVerification.account
  )
  account_verification!: AccountVerification;

  @BeforeInsert()
  generateIdText() {
    this.id_text = generateRandomIdText();
  }
}
