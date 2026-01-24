export interface DTOLiveItem {
  id: number;
  item_id: number;
  live_item_status: {
    id: LiveItemStatusEnum;
  };
  live_item_status_id: LiveItemStatusEnum;
  start_time: string;
  end_time?: string | null;
  chat_web_url?: string | null;
}

export enum LiveItemStatusEnum {
  Pending = 1,
  Live = 2,
  Ended = 3
}
