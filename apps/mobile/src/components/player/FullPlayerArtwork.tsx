import { useCallback, useMemo, useState } from 'react';
import type { LayoutChangeEvent } from 'react-native';
import { StyleSheet, View } from 'react-native';

import { shouldUseChapterArtwork } from '@podverse/helpers';
import type { DTOItemChapter } from '@podverse/helpers/dto';

import { PodverseVideoSurfaceView } from '../../../modules/podverse-media-engine';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { useActiveNowPlayingChapter } from '../../playback/useNowPlayingChapters';
import { CoverImage } from '../primitives/CoverImage';

type FullPlayerArtworkProps = {
  accessibilityLabel: string;
  /** Square edge from layout math, used until the band reports its measured size. */
  artworkSize: number;
  /** Phone or tablet cap, so a tall viewport does not grow the square without limit. */
  artworkSizeCap: number;
  chapters: DTOItemChapter[];
};

/**
 * Full-player artwork square. Swaps in chapter art when the active chapter has an image and the
 * target is not a clip or official clip — same gate web uses via `shouldUseChapterArtwork`.
 *
 * The band is the one part of the fixed region that flexes, and it sizes the square from its own
 * measured box. Bands whose text can grow with the OS font setting therefore take their space from
 * the artwork instead of pushing the transport rows past the bottom of the region.
 */
export function FullPlayerArtwork({
  accessibilityLabel,
  artworkSize,
  artworkSizeCap,
  chapters,
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

  const [measuredBand, setMeasuredBand] = useState<{ height: number; width: number } | null>(null);

  const handleBandLayout = useCallback((event: LayoutChangeEvent) => {
    const { height, width } = event.nativeEvent.layout;
    setMeasuredBand((current) => {
      if (
        current !== null &&
        Math.abs(current.height - height) < 1 &&
        Math.abs(current.width - width) < 1
      ) {
        return current;
      }
      return { height, width };
    });
  }, []);

  const squareSize =
    measuredBand === null
      ? artworkSize
      : Math.max(0, Math.min(measuredBand.height, measuredBand.width, artworkSizeCap));

  const styles = useMemo(
    () =>
      StyleSheet.create({
        artwork: {
          height: '100%',
          width: '100%',
        },
        viewerBand: {
          alignItems: 'center',
          flexGrow: 1,
          flexShrink: 1,
          justifyContent: 'center',
          minHeight: 0,
          width: '100%',
        },
        viewerSquare: {
          alignSelf: 'center',
          height: squareSize,
          overflow: 'hidden',
          width: squareSize,
        },
      }),
    [squareSize]
  );

  if (nowPlaying === null) {
    return <View onLayout={handleBandLayout} style={styles.viewerBand} />;
  }

  return (
    <View onLayout={handleBandLayout} style={styles.viewerBand}>
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
