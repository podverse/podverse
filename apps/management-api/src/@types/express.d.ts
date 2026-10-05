export type AuthenticatedAdmin = {
  id: number;
  id_text: string;
  email: string | null;
  username: string | null;
  admin_account_role_id: number;
  role: string;
  permissions: {
    feeds_crud: number;
    feed_takedown_reasons_crud: number;
    admins_crud: number;
    stats_crud: number;
    billing_prices_crud?: number;
    bucket_crud?: number;
    embed_demo_crud?: number;
    notifications_crud?: number;
    billing_channels_crud?: number;
    billing_processor_products_crud?: number;
    billing_account_crud?: number;
    billing_webhook_events_crud?: number;
  } | null;
};

declare global {
  namespace Express {
    interface User extends AuthenticatedAdmin {}
    interface Request {
      id?: string;
    }
  }
}

export {};
