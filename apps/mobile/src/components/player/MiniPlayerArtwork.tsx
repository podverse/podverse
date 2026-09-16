import { StyleSheet, View } from 'react-native';

import { shouldUseChapterArtwork } from '@podverse/helpers';

import { PodverseVideoSurfaceView } from '../../../modules/podverse-media-engine';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import {
  useActiveNowPlayingChapter,
  useNowPlayingChapters,
} from '../../playback/useNowPlayingChapters';
import { MINI_PLAYER_ARTWORK_SIZE } from '../../theme/screenLayout';
import { CoverImage } from '../primitives/CoverImage';

type MiniPlayerArtworkProps = {
  accessibilityLabel: string;
};

/** Mini-player artwork with optional chapter image swap. Isolated for playhead-driven chapter art. */
export function MiniPlayerArtwork({ accessibilityLabel }: MiniPlayerArtworkProps) {
  const { activeTarget, nowPlaying } = usePlaybackSession();
  const { chapters } = useNowPlayingChapters();
  const activeChapter = useActiveNowPlayingChapter(chapters);

  if (nowPlaying === null || activeTarget === null) {
    return null;
  }

  const useChapterArt = shouldUseChapterArtwork({
    mpClip: activeTarget.kind === 'clip' ? activeTarget.clip : null,
    mpItemChapter: activeChapter,
    mpItemSoundbite: activeTarget.kind === 'soundbite' ? activeTarget.soundbite : null,
  });
  const chapterImg =
    useChapterArt && typeof activeChapter?.img === 'string' && activeChapter.img.length > 0
      ? activeChapter.img
      : null;
  const imageUri = chapterImg ?? nowPlaying.imageUrl;

  return (
    <View style={styles.videoSurface} testID="mini-player-video-surface">
      <CoverImage
        accessibilityLabel={accessibilityLabel}
        opensViewer={false}
        style={styles.artwork}
        uri={imageUri}
      />
      <PodverseVideoSurfaceView style={StyleSheet.absoluteFill} targetId="mini" />
    </View>
  );
}

const styles = StyleSheet.create({
  artwork: {
    height: MINI_PLAYER_ARTWORK_SIZE,
    width: MINI_PLAYER_ARTWORK_SIZE,
  },
  videoSurface: {
    height: MINI_PLAYER_ARTWORK_SIZE,
    width: MINI_PLAYER_ARTWORK_SIZE,
  },
});
