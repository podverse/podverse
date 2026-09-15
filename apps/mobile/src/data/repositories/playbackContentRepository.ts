import type { DTOChannel, DTOClip, DTOItem, DTOItemSoundbite } from '@podverse/helpers/dto';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { buildChannelFromDownload } from '../../lib/playback/buildChannelFromDownload';
import { channelItemsRepository } from './channelItemsRepository';
import { downloadsRepository } from './downloadsRepository';
import type { MobileAuthRequestContext } from './types';

/**
 * Fetches full content DTOs needed to start playback from id-only surfaces (e.g. Home rows carry
 * only an `id_text`, not enclosures). Detail screens already hold full DTOs and pass them directly;
 * this repository backs the id-based play paths so screens/hooks never call `req*` themselves.
 *
 * Items are read from the device first, which is what lets an episode from a subscribed channel
 * start with no connection. A channel for play is taken from the stored item, a sibling on the
 * same channel, or the download row when Offline Mode blocks the channel fetch.
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

  getLocalChannelForItem: async (itemIdText: string): Promise<DTOChannel | null> => {
    const stored = await channelItemsRepository.getByIdText(itemIdText);
    if (stored?.channel !== undefined) {
      return stored.channel;
    }

    const channelIdText = await channelItemsRepository.getChannelIdForItem(itemIdText);
    if (channelIdText !== null) {
      const siblings = await channelItemsRepository.listByChannel(channelIdText);
      for (const sibling of siblings) {
        if (sibling.channel !== undefined) {
          return sibling.channel;
        }
      }
    }

    const download = await downloadsRepository.getByItemIdText(itemIdText);
    return download === null ? null : buildChannelFromDownload(download);
  },
};
