import { mergeDTOItemThenChannelImageCandidates } from '../image.js';

/** Merge stored queue/playlist Add-by-RSS `item_images` and `channel_images` for list/row artwork. */
export function addByRSSResourceMergedArtworkCandidates(
  resourceData:
    | {
        item_images?: Parameters<typeof mergeDTOItemThenChannelImageCandidates>[0];
        channel_images?: Parameters<typeof mergeDTOItemThenChannelImageCandidates>[1];
      }
    | null
    | undefined,
  sizeFindTarget: number,
  comparison: 'greater' | 'lesser' | null
): string[] {
  if (!resourceData) {
    return [];
  }
  return mergeDTOItemThenChannelImageCandidates(
    resourceData.item_images,
    resourceData.channel_images,
    sizeFindTarget,
    comparison
  );
}
