import type { DTOChannel, DTOClip, DTOItem, DTOItemSoundbite } from '@podverse/helpers/dto';

import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import type { MobileAuthRequestContext } from './types';

/**
 * Fetches full content DTOs needed to start playback from id-only surfaces (e.g. Home rows carry
 * only an `id_text`, not enclosures). Detail screens already hold full DTOs and pass them directly;
 * this repository backs the id-based play paths so screens/hooks never call `req*` themselves.
 * Read-through only (no SQLite cache) — playback content is fetched fresh at play time.
 */
export const playbackContentRepository = {
  getItemByIdText: async (context: MobileAuthRequestContext, idText: string): Promise<DTOItem> => {
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
