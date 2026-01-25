export interface DTOAccountUPDevice {
  id: number;
  account_id: number;
  up_endpoint: string;
  up_auth_key: string | null;
  locale: string;
  created_at: string;
  updated_at: string;
}

export type CreateAccountUPDeviceParams = {
  up_endpoint: string;
  up_auth_key: string | null;
};

export type UpdateAccountUPDeviceParams = {
  up_endpoint: string;
  up_auth_key: string | null;
};

export type DeleteAccountUPDeviceParams = {
  up_endpoint: string;
};
