import { mergeDTOItemThenChannelImageHeroCandidates } from '@podverse/helpers';

type ItemImages = Parameters<typeof mergeDTOItemThenChannelImageHeroCandidates>[0];
type ChannelImages = Parameters<typeof mergeDTOItemThenChannelImageHeroCandidates>[1];

/**
 * Display URL for the item-detail header square: hero selection at the painted edge, with a
 * fallback when the item has no width metadata (common for Add by RSS).
 */
export function itemDetailArtworkUri(
  itemImages: ItemImages,
  channelImages: ChannelImages,
  edge: number,
  fallback: string | null
): string | null {
  return (
    mergeDTOItemThenChannelImageHeroCandidates(itemImages, channelImages, edge, 'greater')[0] ??
    fallback
  );
}
