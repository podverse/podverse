export interface DTOAccountFCMDevice {
  id: number;
  account_id: number;
  fcm_token: string;
  installation_id: string;
  platform: AccountFCMDevicePlatformValues;
  locale: string;
  created_at: string;
  updated_at: string;
}

export enum AccountFCMDevicePlatformEnum {
  Web = 'web',
  Android = 'android',
  iOS = 'ios'
}

export const ACCOUNT_FCM_DEVICE_PLATFORM_VALUES = Object.values(AccountFCMDevicePlatformEnum);

export type AccountFCMDevicePlatformValues = typeof ACCOUNT_FCM_DEVICE_PLATFORM_VALUES[number];

export type CreateAccountFCMDeviceParams = {
  fcm_token: string;
  installation_id: string;
  platform: AccountFCMDevicePlatformValues;
};

export type UpdateAccountFCMDeviceParams = {
  new_fcm_token: string;
  installation_id: string;
  previous_fcm_token: string | null;
  platform: AccountFCMDevicePlatformValues;
};

export type DeleteAccountFCMDeviceParams = {
  fcm_token: string | null;
  installation_id: string | null;
};
