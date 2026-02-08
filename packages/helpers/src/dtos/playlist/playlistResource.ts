import type { AddByRSSResourceData } from '../addByRSSResourceData.js';
import type { DTOClip } from '../clip.js';
import type { DTOItem } from '../item/item.js';
import type { DTOItemSoundbite } from '../item/itemSoundbite.js';

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
  add_by_rss_resource_data?: AddByRSSResourceData | null;
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
