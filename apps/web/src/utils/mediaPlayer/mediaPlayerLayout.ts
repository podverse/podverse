/**
 * Applies or removes the media-player-active class on sidebar, page-wrapper, and media-player
 * so the layout reserves space at the bottom for the player.
 * Only applies the "active" layout when the #media-player element exists (i.e. the lazy-loaded
 * MediaPlayer component has mounted). This prevents a blank rectangle from appearing when
 * something is playing but the player UI has not yet loaded.
 */
export function updateLayoutForMediaPlayer(nowPlayingItem: unknown) {
  const sidebar = document.getElementById('sidebar');
  const pageWrapper = document.getElementById('page-wrapper');
  const mediaPlayer = document.getElementById('media-player');
  const activeClass = 'media-player-active';

  const shouldBeActive = !!nowPlayingItem;

  if (shouldBeActive) {
    // Only reserve space when the media player element exists (lazy component has mounted).
    // Otherwise we would show a blank gap before the player renders.
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
