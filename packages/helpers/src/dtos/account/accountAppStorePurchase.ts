export interface DTOAccountAppStorePurchase {
  transaction_id: string;
  account_id: number;
  cancellation_date?: string | null;
  cancellation_date_ms?: string | null;
  cancellation_date_pst?: string | null;
  cancellation_reason?: string | null;
  expires_date?: string | null;
  expires_date_ms?: string | null;
  expires_date_pst?: string | null;
  is_in_intro_offer_period?: boolean | null;
  is_trial_period?: boolean | null;
  original_purchase_date?: string | null;
  original_purchase_date_ms?: string | null;
  original_purchase_date_pst?: string | null;
  original_transaction_id?: string | null;
  product_id?: string | null;
  promotional_offer_id?: string | null;
  purchase_date?: string | null;
  purchase_date_ms?: string | null;
  purchase_date_pst?: string | null;
  quantity?: number | null;
  web_order_line_item_id?: string | null;
}
