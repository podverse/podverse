import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import type { DTOItemChapter } from '@podverse/helpers/dto';

import { PodverseVideoSurfaceView } from '../../../modules/podverse-media-engine';
import { usePlaybackSession } from '../../playback/PlaybackProvider';
import { useActiveNowPlayingChapter } from '../../playback/useNowPlayingChapters';
import { CoverImage } from '../primitives/CoverImage';
import { resolvePlayerChapterArtworkUri } from './playerChapterArtwork';

type FullPlayerArtworkProps = {
  accessibilityLabel: string;
  /** Square edge from layout math. Not taken from a later measurement of this band. */
  artworkSize: number;
  chapters: DTOItemChapter[];
};

/**
 * Full-player artwork square. Swaps in chapter art when the active chapter has an image and the
 * target is not a clip or official clip — same gate web uses via `shouldUseChapterArtwork`.
 *
 * `artworkSize` is the square's edge. It comes from layout math, not from measuring this band.
 * The band still flexes so leftover space stays with the artwork.
 */
export function FullPlayerArtwork({
  accessibilityLabel,
  artworkSize,
  chapters,
}: FullPlayerArtworkProps) {
  const { activeTarget, nowPlaying } = usePlaybackSession();
  const activeChapter = useActiveNowPlayingChapter(chapters);

  const imageUri = resolvePlayerChapterArtworkUri({
    activeChapter,
    chapters,
    fallbackUri: nowPlaying?.viewerImageUrl ?? nowPlaying?.imageUrl ?? null,
    mpClip: activeTarget?.kind === 'clip' ? activeTarget.clip : null,
    mpItemSoundbite: activeTarget?.kind === 'soundbite' ? activeTarget.soundbite : null,
  });

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
          height: artworkSize,
          overflow: 'hidden',
          width: artworkSize,
        },
      }),
    [artworkSize]
  );

  if (nowPlaying === null) {
    return <View style={styles.viewerBand} />;
  }

  return (
    <View style={styles.viewerBand}>
      <View pointerEvents="box-none" style={styles.viewerSquare} testID="full-player-video-surface">
        <CoverImage
          accessibilityLabel={accessibilityLabel}
          style={styles.artwork}
          testID="full-player-artwork"
          uri={imageUri}
          viewerUri={imageUri}
        />
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          <PodverseVideoSurfaceView style={StyleSheet.absoluteFill} targetId="full" />
        </View>
      </View>
    </View>
  );
}
