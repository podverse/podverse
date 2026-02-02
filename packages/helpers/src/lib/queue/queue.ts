import type { DTOQueue } from '../../dtos/index.js';
import { MediumEnum } from '../medium.js';

export const getQueueForMedium = (queues: DTOQueue[], medium_id: number) => {
  if (medium_id === MediumEnum.Podcast || medium_id === MediumEnum.Video) {
    return queues.find((q) => q.medium_id === MediumEnum.AV) ?? null;
  }
  return queues.find((q) => q.medium_id === medium_id) ?? null;
};

export const getQueueMediumIdForChannelMediumId = (channelMediumId?: number) => {
  if (channelMediumId === MediumEnum.Podcast || channelMediumId === MediumEnum.Video) {
    return MediumEnum.AV;
  } else if (channelMediumId === MediumEnum.Music) {
    return MediumEnum.Music;
  }
  return null;
};
