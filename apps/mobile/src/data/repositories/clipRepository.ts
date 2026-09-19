import type { DTOClip } from '@podverse/helpers';
import { SharableStatusEnum } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import type { MobileAuthRequestContext } from './types';

type ClipVisibility =
  SharableStatusEnum.Public | SharableStatusEnum.Unlisted | SharableStatusEnum.Private;

export type CreateClipInput = {
  itemIdText: string;
  title: string | null;
  startTimeSeconds: number;
  endTimeSeconds: number | null;
  visibility: ClipVisibility;
};

export type UpdateClipInput = CreateClipInput & {
  clipIdText: string;
};

const formatTimeSeconds = (value: number): string => {
  return String(Math.max(0, Math.floor(value)));
};

const toSharableStatusId = (visibility: ClipVisibility): number => {
  return visibility;
};

const fromSharableStatusId = (value: number | undefined): ClipVisibility => {
  if (value === SharableStatusEnum.Public) {
    return SharableStatusEnum.Public;
  }
  if (value === SharableStatusEnum.Unlisted) {
    return SharableStatusEnum.Unlisted;
  }
  return SharableStatusEnum.Private;
};

const toRequestPayload = (input: CreateClipInput) => {
  return {
    end_time: input.endTimeSeconds !== null ? formatTimeSeconds(input.endTimeSeconds) : null,
    item_id_text: input.itemIdText,
    sharable_status_id: toSharableStatusId(input.visibility),
    start_time: formatTimeSeconds(input.startTimeSeconds),
    title: input.title,
  };
};

export const clipRepository = {
  create: async (context: MobileAuthRequestContext, input: CreateClipInput): Promise<DTOClip> => {
    return requestWithMobileAuthRefresh(context, async (api) =>
      api.reqClipCreate(toRequestPayload(input))
    );
  },

  update: async (context: MobileAuthRequestContext, input: UpdateClipInput): Promise<DTOClip> => {
    return requestWithMobileAuthRefresh(context, async (api) =>
      api.reqClipUpdate(input.clipIdText, toRequestPayload(input))
    );
  },

  delete: async (context: MobileAuthRequestContext, clipIdText: string): Promise<void> => {
    await requestWithMobileAuthRefresh(context, async (api) => api.reqClipDelete(clipIdText));
  },

  getByIdText: async (context: MobileAuthRequestContext, clipIdText: string): Promise<DTOClip> => {
    return requestWithMobileAuthRefresh(context, async (api) => api.reqClipGet(clipIdText));
  },

  toVisibility: (clip: DTOClip): ClipVisibility => {
    return fromSharableStatusId(clip.sharable_status?.id);
  },
};
