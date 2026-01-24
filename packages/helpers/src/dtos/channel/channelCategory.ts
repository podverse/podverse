export interface DTOChannelCategory {
  id: number;
  channel_id: number;
  category_id: number;
  category: {
    id: number;
    display_name: string;
    slug: string;
    mapping_key: string;
  }
}
