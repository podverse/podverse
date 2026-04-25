import type { ListEpisodeRowLike } from '../../components/List/Podcasts/Episodes/ListEpisodeRow';

export type ListLikeRowBatch = {
  isLiked: (id: string) => boolean;
  toggle: (id: string) => void | Promise<void>;
};

/**
 * Build the `likeRow` prop for list row components that use {@link ListEpisodeRowLike}:
 * one stable object shape for item, clip, and add-by-RSS (hash) ids.
 */
export function buildListLikeRow(idText: string, batch: ListLikeRowBatch): ListEpisodeRowLike {
  return {
    isLiked: batch.isLiked(idText),
    onToggle: () => {
      void batch.toggle(idText);
    },
  };
}
