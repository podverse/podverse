export type AuthenticatedAdmin = {
  id: number;
  id_text: string;
  email: string;
  admin_account_role_id: number;
  role: string;
  permissions: {
    feeds_crud: number;
    feed_flag_statuses_crud: number;
    feed_flag_status_reasons_crud: number;
    admins_crud: number;
    stats_crud: number;
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
