import type { DTOAccountAppStorePurchase } from './accountAppStorePurchase.js';
import type { DTOAccountCredentials } from './accountCredentials.js';
import type { DTOAccountEmailChangeVerification } from './accountEmailChangeVerification.js';
import type { DTOAccountFCMDevice } from './accountFCMDevice.js';
import type { DTOAccountFollowingAccount } from './accountFollowingAccount.js';
import type { DTOAccountFollowingAddByRSSChannel } from './accountFollowingAddByRSSChannel.js';
import type { DTOAccountFollowingChannel } from './accountFollowingChannel.js';
import type { DTOAccountFollowingPlaylist } from './accountFollowingPlaylist.js';
import type { DTOAccountGooglePlayPurchase } from './accountGooglePlayPurchase.js';
import type { DTOAccountMembershipStatus } from './accountMembershipStatus.js';
import type { DTOAccountNotificationChannel } from './accountNotificationChannel.js';
import type { DTOAccountPayPalOrder } from './accountPayPalOrder.js';
import type { DTOAccountProfile } from './accountProfile.js';
import type { DTOAccountResetPassword } from './accountResetPassword.js';
import type { DTOAccountSettings } from './accountSettings/accountSettings.js';
import type { DTOAccountUPDevice } from './accountUPDevice.js';
import type { DTOAccountVerification } from './accountVerification.js';

export interface DTOAccount {
  id: number;
  id_text: string;
  verified: boolean;
  /** Present only on `GET /auth/me` for the logged-in user. Omitted on all other account responses. */
  sender_guid?: string;
  sharable_status_id?: number;
  account_app_store_purchases?: DTOAccountAppStorePurchase[];
  account_credentials?: DTOAccountCredentials;
  account_email_change_verification?: DTOAccountEmailChangeVerification;
  account_fcm_devices?: DTOAccountFCMDevice[];
  account_following_accounts?: DTOAccountFollowingAccount[];
  account_following_add_by_rss_channels?: DTOAccountFollowingAddByRSSChannel[];
  account_following_channels?: DTOAccountFollowingChannel[];
  account_following_playlists?: DTOAccountFollowingPlaylist[];
  account_google_play_purchases?: DTOAccountGooglePlayPurchase[];
  account_membership_status?: DTOAccountMembershipStatus;
  account_notification_channels?: DTOAccountNotificationChannel[];
  account_paypal_orders?: DTOAccountPayPalOrder[];
  account_profile?: DTOAccountProfile;
  account_reset_password?: DTOAccountResetPassword;
  account_settings?: DTOAccountSettings;
  account_up_devices?: DTOAccountUPDevice[];
  account_verification?: DTOAccountVerification;
}
