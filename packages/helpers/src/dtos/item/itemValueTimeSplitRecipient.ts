export interface DTOItemValueTimeSplitRecipient {
  id: number;
  item_value_time_split_id: number;
  type: string;
  address: string;
  split: number;
  name?: string | null;
  custom_key?: string | null;
  custom_value?: string | null;
  fee: boolean;
}
