export interface DTOItemValueRecipient {
  id: number;
  item_value_id: number;
  type: string;
  address: string;
  split: number;
  name?: string | null;
  custom_key?: string | null;
  custom_value?: string | null;
  fee: boolean;
}
