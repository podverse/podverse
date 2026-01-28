import { DTOClip } from '../clip';
import { DTOItem } from '../item/item';
import { DTOItemSoundbite } from '../item/itemSoundbite';

export interface DTOPlaylistResource {
  id: number;
  playlist_id: number;
  list_position: string;
  clip?: DTOClip;
  clip_id: number | null;
  item?: DTOItem;
  item_id: number | null;
  item_soundbite?: DTOItemSoundbite;
  item_soundbite_id: number | null;
  add_by_rss_resource_data?: object | null;
  add_by_rss_hash_id?: string | null;
}

export interface DTOPlaylistResourceIdsOnly {
  clip_id?: number;
  item_id?: number;
  item_soundbite_id?: number;
  add_by_rss_hash_id?: string;
}

export type PlaylistResourceIdTextOptions = {
  item_id_text?: string;
  clip_id_text?: string;
  item_soundbite_id_text?: string;
};
