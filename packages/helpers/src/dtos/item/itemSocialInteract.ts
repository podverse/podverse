export interface DTOItemSocialInteract {
  id: number;
  item_id: number;
  protocol: string;
  uri: string;
  account_id?: string | null;
  account_url?: string | null;
  priority?: number | null;
}
