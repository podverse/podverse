import type { DTOChannel, DTOClip, DTOItem, DTOItemSoundbite } from '@podverse/helpers/dto';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { channelItemsRepository } from './channelItemsRepository';
import type { MobileAuthRequestContext } from './types';

/**
 * Fetches full content DTOs needed to start playback from id-only surfaces (e.g. Home rows carry
 * only an `id_text`, not enclosures). Detail screens already hold full DTOs and pass them directly;
 * this repository backs the id-based play paths so screens/hooks never call `req*` themselves.
 *
 * Items are read from the device first, which is what lets an episode from a subscribed channel
 * start with no connection. Clips, soundbites, and channels have no stored equivalent and are
 * fetched at play time.
 */
export const playbackContentRepository = {
  getItemByIdText: async (context: MobileAuthRequestContext, idText: string): Promise<DTOItem> => {
    const stored = await channelItemsRepository.getByIdText(idText);
    if (stored !== null) {
      return stored;
    }

    return requestWithMobileAuthRefresh(context, async (api) => api.reqItemGetByIdOrIdText(idText));
  },

  getClipByIdText: async (context: MobileAuthRequestContext, idText: string): Promise<DTOClip> => {
    return requestWithMobileAuthRefresh(context, async (api) => api.reqClipGet(idText));
  },

  getSoundbiteByIdText: async (
    context: MobileAuthRequestContext,
    idText: string
  ): Promise<DTOItemSoundbite> => {
    return requestWithMobileAuthRefresh(context, async (api) => api.reqItemSoundbiteGet(idText));
  },

  getChannelById: async (
    context: MobileAuthRequestContext,
    idOrIdText: string | number
  ): Promise<DTOChannel> => {
    return requestWithMobileAuthRefresh(context, async (api) =>
      api.reqChannelGetByIdOrIdText(idOrIdText)
    );
  },
};
