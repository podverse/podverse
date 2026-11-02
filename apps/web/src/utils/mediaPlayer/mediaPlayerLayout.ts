export type UpdateLayoutForMediaPlayerOptions = {
  skipMainAppLayoutMutations?: boolean;
};

/**
 * Applies or removes the media-player-active class on sidebar, page-wrapper, and media-player
 * so the layout reserves space at the bottom for the player.
 * `#media-player` may be the lazy-load placeholder or the mounted MediaPlayer; both share the id
 * so the bar height can reserve before the chunk finishes loading.
 */
export function updateLayoutForMediaPlayer(
  nowPlayingItem: unknown,
  options?: UpdateLayoutForMediaPlayerOptions
) {
  if (options?.skipMainAppLayoutMutations) {
    return;
  }

  const sidebar = document.getElementById('sidebar');
  const pageWrapper = document.getElementById('page-wrapper');
  const mediaPlayer = document.getElementById('media-player');
  const activeClass = 'media-player-active';

  const shouldBeActive = !!nowPlayingItem;

  if (shouldBeActive) {
    if (!mediaPlayer) {
      return;
    }
    if (sidebar && !sidebar.classList.contains(activeClass)) {
      sidebar.classList.add(activeClass);
    }
    if (pageWrapper && !pageWrapper.classList.contains(activeClass)) {
      pageWrapper.classList.add(activeClass);
    }
    if (!mediaPlayer.classList.contains(activeClass)) {
      mediaPlayer.classList.add(activeClass);
    }
  } else {
    if (sidebar?.classList.contains(activeClass)) {
      sidebar.classList.remove(activeClass);
    }
    if (pageWrapper?.classList.contains(activeClass)) {
      pageWrapper.classList.remove(activeClass);
    }
    if (mediaPlayer?.classList.contains(activeClass)) {
      mediaPlayer.classList.remove(activeClass);
    }
  }
}

/**
 * Toggles the class that gives the page scroller a trailing spacer while the segment strip
 * overlaps the bottom of the page, so the last row can scroll clear of it.
 */
export function updateLayoutForMediaPlayerSegmentStrip(
  segmentStripVisible: boolean,
  options?: UpdateLayoutForMediaPlayerOptions
) {
  if (options?.skipMainAppLayoutMutations) {
    return;
  }
  document
    .getElementById('page-wrapper')
    ?.classList.toggle('media-player-segment-strip-active', segmentStripVisible);
}
