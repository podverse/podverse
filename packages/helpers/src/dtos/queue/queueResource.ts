import { DTOClip } from '../clip';
import { DTOItem } from '../item/item';
import { DTOItemSoundbite } from '../item/itemSoundbite';

export interface DTOQueueResource {
  id: number;
  playlist_id: number;
  list_position: string;
  playback_position: string;
  media_file_duration: string;
  completed: boolean;
  clip?: DTOClip;
  clip_id: number | null;
  item: DTOItem;
  item_id: number | null;
  item_soundbite?: DTOItemSoundbite;
  item_soundbite_id: number | null;
  add_by_rss_resource_data?: object | null;
  add_by_rss_hash_id?: string | null;
}
