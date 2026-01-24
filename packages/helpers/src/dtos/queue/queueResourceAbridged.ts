export interface DTOQueueResourceAbridgedResponseData {
  i: number; // id
  p: string; // playback_position
  d: string; // media_file_duration
  z?: boolean; // completed
  c?: number; // clip_id
  t?: number; // item_id
  s?: number; // item_soundbite_id
  a?: string; // add_by_rss_hash_id
}

type QueueResourceAbridgedIndexData = {
  p: string; // playback_position
  d: string; // media_file_duration
  z?: boolean; // completed
}

export type QueueResourcesAbridgedIndex = {
  items: {
    [id: number]: QueueResourceAbridgedIndexData;
  }
  clips: {
    [id: number]: QueueResourceAbridgedIndexData;
  }
  item_soundbites: {
    [id: number]: QueueResourceAbridgedIndexData;
  }
  add_by_rss_resource_datas: {
    [hash_id: string]: QueueResourceAbridgedIndexData;
  }
}