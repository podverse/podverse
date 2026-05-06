import { mergeDTOItemThenChannelImageCandidates, prependDistinctImageCandidate } from '../image.js';

/** Merge stored queue/playlist Add-by-RSS image arrays; prepend legacy `channel_image_url` when distinct. */
export function addByRSSResourceMergedArtworkCandidates(
  resourceData:
    | {
        item_images?: Parameters<typeof mergeDTOItemThenChannelImageCandidates>[0];
        channel_images?: Parameters<typeof mergeDTOItemThenChannelImageCandidates>[1];
        channel_image_url?: string | null;
      }
    | null
    | undefined,
  sizeFindTarget: number,
  comparison: 'greater' | 'lesser' | null
): string[] {
  if (!resourceData) {
    return [];
  }
  const base = mergeDTOItemThenChannelImageCandidates(
    resourceData.item_images,
    resourceData.channel_images,
    sizeFindTarget,
    comparison
  );
  const extra =
    typeof resourceData.channel_image_url === 'string' ? resourceData.channel_image_url.trim() : '';
  return prependDistinctImageCandidate(extra || undefined, base);
}
