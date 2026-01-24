export interface DTOCategory {
  id: number;
  parent_id: number | null;
  display_name: string;
  slug: string;
  mapping_key: string | null;
  children?: DTOCategory[];
}
