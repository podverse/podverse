export interface DTOAccountWebPushDevice {
  id: number;
  account_id: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  locale: string;
  created_at: string;
  updated_at: string;
}

export type CreateAccountWebPushDeviceParams = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type UpdateAccountWebPushDeviceParams = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type DeleteAccountWebPushDeviceParams = {
  endpoint: string;
};
