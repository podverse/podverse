import { LiveItemStatusEnum } from '../dtos/liveItem/liveItem.js';

export function getLiveItemStatusEnumValue(input: string | null): LiveItemStatusEnum | null {
  const sanitizedInput = input
    ?.toLowerCase()
    .replace(/\s+/g, '')
    .replace(/[^a-z0-9]/g, '');

  const mapping: { [key: string]: LiveItemStatusEnum } = {
    pending: LiveItemStatusEnum.Pending,
    live: LiveItemStatusEnum.Live,
    ended: LiveItemStatusEnum.Ended,
  };

  return (sanitizedInput && mapping[sanitizedInput]) || null;
}
