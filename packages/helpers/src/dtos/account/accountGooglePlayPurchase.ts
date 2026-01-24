export interface DTOAccountGooglePlayPurchase {
  order_id: string;
  account_id: number;
  product_id: string;
  purchase_token: string;
  purchase_time: string;
  purchase_state: number;
  acknowledged: boolean;
  auto_renewing?: boolean | null;
  price_amount_micros?: string | null;
  price_currency_code?: string | null;
  country_code?: string | null;
  cancel_reason?: number | null;
  user_cancellation_time?: string | null;
}
