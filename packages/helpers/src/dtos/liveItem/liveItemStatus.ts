export interface DTOLiveItemStatus {
  id: number;
  status: 'pending' | 'live' | 'ended';
}

export type LiveItemStatus = 'pending' | 'live' | 'ended';

export const LIVE_ITEM_STATUSES = ['pending', 'live', 'ended'] as const;
