export type PaymentRecipient = {
  id: string;
  type: string;
  address: string;
  name: string | null;
  custom_key?: string | null;
  custom_value?: string | null;
  normalized_split: number;
  final_amount: number;
};

export type RecipientStatus = PaymentRecipient & {
  status: 'pending' | 'paying' | 'success' | 'failed';
  error?: string;
};
