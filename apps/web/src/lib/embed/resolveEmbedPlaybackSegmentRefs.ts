import type { DTOClip, DTOItemSoundbite } from '@podverse/helpers';

export type ResolveEmbedPlaybackSegmentRefsParams = {
  hasPlayerContent: boolean;
  mpClip: DTOClip | null;
  mpItemSoundbite: DTOItemSoundbite | null;
  fallbackClip: DTOClip | null;
  fallbackItemSoundbite: DTOItemSoundbite | null;
};

export type EmbedPlaybackSegmentRefs = {
  clip: DTOClip | null;
  itemSoundbite: DTOItemSoundbite | null;
};

/**
 * Resolves clip/soundbite refs for embed UI. Before the player loads, SSR
 * fallback drives segment title/bar display. After load, only live player state
 * applies — when orchestrator clears mpClip/mpItemSoundbite at segment end,
 * embed UI falls back to episode/chapter presentation (main-player parity).
 */
export function resolveEmbedPlaybackSegmentRefs(
  params: ResolveEmbedPlaybackSegmentRefsParams
): EmbedPlaybackSegmentRefs {
  if (params.hasPlayerContent) {
    return {
      clip: params.mpClip,
      itemSoundbite: params.mpItemSoundbite,
    };
  }

  return {
    clip: params.fallbackClip,
    itemSoundbite: params.fallbackItemSoundbite,
  };
}
