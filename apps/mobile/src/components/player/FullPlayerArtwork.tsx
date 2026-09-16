import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { shouldUseChapterArtwork } from '@podverse/helpers';
import type { DTOItemChapter } from '@podverse/helpers/dto';

import { PodverseVideoSurfaceView } from '../../../modules/podverse-media-engine';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { useActiveNowPlayingChapter } from '../../playback/useNowPlayingChapters';
import { CoverImage } from '../primitives/CoverImage';

type FullPlayerArtworkProps = {
  accessibilityLabel: string;
  artworkSize: number;
  chapters: DTOItemChapter[];
  viewerHeight: number;
};

/**
 * Full-player artwork square. Swaps in chapter art when the active chapter has an image and the
 * target is not a clip or official clip — same gate web uses via `shouldUseChapterArtwork`.
 */
export function FullPlayerArtwork({
  accessibilityLabel,
  artworkSize,
  chapters,
  viewerHeight,
}: FullPlayerArtworkProps) {
  const { activeTarget, nowPlaying } = usePlaybackSession();
  const activeChapter = useActiveNowPlayingChapter(chapters);

  const useChapterArt = shouldUseChapterArtwork({
    mpClip: activeTarget?.kind === 'clip' ? activeTarget.clip : null,
    mpItemChapter: activeChapter,
    mpItemSoundbite: activeTarget?.kind === 'soundbite' ? activeTarget.soundbite : null,
  });
  const chapterImg =
    useChapterArt && typeof activeChapter?.img === 'string' && activeChapter.img.length > 0
      ? activeChapter.img
      : null;
  const imageUri = chapterImg ?? nowPlaying?.viewerImageUrl ?? nowPlaying?.imageUrl ?? null;

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          height: '100%',
          width: '100%',
        },
        viewerBand: {
          alignItems: 'center',
          height: viewerHeight,
          justifyContent: 'center',
          minHeight: 0,
        },
        viewerSquare: {
          alignSelf: 'center',
          height: artworkSize,
          overflow: 'hidden',
          width: artworkSize,
        },
      }),
    [artworkSize, viewerHeight]
  );

  if (nowPlaying === null) {
    return <View style={styles.viewerBand} />;
  }

  return (
    <View style={styles.viewerBand}>
      <View style={styles.viewerSquare} testID="full-player-video-surface">
        <CoverImage
          accessibilityLabel={accessibilityLabel}
          style={styles.artwork}
          uri={imageUri}
          viewerUri={imageUri}
        />
        <PodverseVideoSurfaceView style={StyleSheet.absoluteFill} targetId="full" />
      </View>
    </View>
  );
}
