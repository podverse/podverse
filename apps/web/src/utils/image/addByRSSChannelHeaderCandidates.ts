import {
  buildDTOChannelImageLoadCandidates,
  prependDistinctImageCandidate,
} from '@podverse/helpers';

import { IMAGES } from '../../constants/images';

/** Parsed RSS channel `images` plus optional feed-level override URL; Add-by-RSS headers use `greater` like Core responsive headers. */
export function addByRSSChannelHeaderGreaterBreakpointCandidates(
  channelImages: Parameters<typeof buildDTOChannelImageLoadCandidates>[0],
  feedImageUrl: string | null | undefined,
  sizeFindTarget: number
): string[] {
  return prependDistinctImageCandidate(
    feedImageUrl ?? undefined,
    buildDTOChannelImageLoadCandidates(channelImages, sizeFindTarget, 'greater')
  );
}

export function addByRSSChannelHeaderTriple(
  channelImages: Parameters<typeof buildDTOChannelImageLoadCandidates>[0],
  feedImageUrl: string | null | undefined
): {
  candidatesMobile: string[];
  candidatesTablet: string[];
  candidatesDesktop: string[];
  primaryUrl: string | undefined;
} {
  const candidatesMobile = addByRSSChannelHeaderGreaterBreakpointCandidates(
    channelImages,
    feedImageUrl,
    IMAGES.HEADER.MOBILE.SQUARE.SIZE_FIND_TARGET
  );
  const candidatesTablet = addByRSSChannelHeaderGreaterBreakpointCandidates(
    channelImages,
    feedImageUrl,
    IMAGES.HEADER.TABLET.SQUARE.SIZE_FIND_TARGET
  );
  const candidatesDesktop = addByRSSChannelHeaderGreaterBreakpointCandidates(
    channelImages,
    feedImageUrl,
    IMAGES.HEADER.DESKTOP.SQUARE.SIZE_FIND_TARGET
  );
  const firstChannelUrl =
    channelImages !== null &&
    channelImages !== undefined &&
    channelImages.length > 0 &&
    typeof channelImages[0]?.url === 'string' &&
    channelImages[0].url.trim() !== ''
      ? channelImages[0].url.trim()
      : undefined;
  const feedTrimmed =
    typeof feedImageUrl === 'string' && feedImageUrl.trim() !== ''
      ? feedImageUrl.trim()
      : undefined;
  const primaryUrl = candidatesDesktop[0] ?? feedTrimmed ?? firstChannelUrl ?? undefined;

  return {
    candidatesMobile,
    candidatesTablet,
    candidatesDesktop,
    primaryUrl,
  };
}
