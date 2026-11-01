import { lockAsync, OrientationLock } from 'expo-screen-orientation';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BackHandler, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { PodverseVideoSurfaceView } from '../../../modules/podverse-media-engine';
import { nativePlaybackBridge } from '../../bridge/nativePlaybackBridge';
import { videoOrientationLockAfterSample } from '../../playback/videoFullscreenOrientation';
import { exitVideoFullscreen } from '../../playback/videoFullscreenStore';
import { VideoCornerChrome, videoCornerChromeInset } from './VideoCornerChrome';

const applyPortraitLock = (): void => {
  void lockAsync(OrientationLock.PORTRAIT_UP).catch(() => undefined);
};

/**
 * Full-window video. Forces landscape, then frees rotation once the phone is sideways.
 * Picture-in-picture uses this same surface: the view stays mounted while that window is up.
 */
export function VideoFullscreenOverlay() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [pictureInPicture, setPictureInPicture] = useState(false);
  const landscapeLockApplied = useRef(false);
  const rotationFree = useRef(false);
  const pipWasActive = useRef(false);
  const alive = useRef(true);
  const surfaceMoved = useRef(false);

  // The fullscreen host registers when its view joins the window. Move the surface on the
  // following frame so that handoff does not report the video as not presented.
  const onSurfaceLayout = (): void => {
    if (surfaceMoved.current) {
      return;
    }
    surfaceMoved.current = true;
    requestAnimationFrame(() => {
      if (!alive.current) {
        return;
      }
      nativePlaybackBridge.animateVideoSurface('fullscreen', 0);
    });
  };

  useEffect(() => {
    let cancelled = false;
    alive.current = true;

    const releaseRotation = (): void => {
      if (rotationFree.current) {
        return;
      }
      const next = videoOrientationLockAfterSample({
        alreadyFree: false,
        deviceLandscape: nativePlaybackBridge.isPhysicalDeviceLandscape(),
        landscapeLockApplied: landscapeLockApplied.current,
      });
      if (next !== 'free') {
        return;
      }
      rotationFree.current = true;
      void lockAsync(OrientationLock.DEFAULT).catch(() => undefined);
    };

    nativePlaybackBridge.setVideoFullscreen(true);

    const orientationSubscription = nativePlaybackBridge.addListener(
      'deviceOrientation',
      (event) => {
        if (
          cancelled ||
          rotationFree.current ||
          !landscapeLockApplied.current ||
          !event.landscape
        ) {
          return;
        }
        rotationFree.current = true;
        void lockAsync(OrientationLock.DEFAULT).catch(() => undefined);
      }
    );

    const pipSubscription = nativePlaybackBridge.addListener('pictureInPicture', (event) => {
      if (cancelled) {
        return;
      }
      if (event.active) {
        pipWasActive.current = true;
        setPictureInPicture(true);
        return;
      }
      setPictureInPicture(false);
      if (event.restore) {
        rotationFree.current = false;
        landscapeLockApplied.current = false;
        void lockAsync(OrientationLock.LANDSCAPE)
          .then(() => {
            if (cancelled) {
              return;
            }
            landscapeLockApplied.current = true;
            releaseRotation();
          })
          .catch(() => undefined);
        return;
      }
      if (pipWasActive.current) {
        pipWasActive.current = false;
        exitVideoFullscreen();
      }
    });

    void lockAsync(OrientationLock.LANDSCAPE)
      .then(() => {
        if (cancelled) {
          return;
        }
        landscapeLockApplied.current = true;
        releaseRotation();
      })
      .catch(() => undefined);

    const backSubscription = BackHandler.addEventListener('hardwareBackPress', () => {
      exitVideoFullscreen();
      return true;
    });

    return () => {
      cancelled = true;
      alive.current = false;
      orientationSubscription.remove();
      pipSubscription.remove();
      backSubscription.remove();
      nativePlaybackBridge.setVideoFullscreen(false);
      nativePlaybackBridge.animateVideoSurface('full', 0);
      applyPortraitLock();
    };
  }, []);

  return (
    <View onLayout={onSurfaceLayout} style={styles.fill} testID="video-fullscreen">
      <StatusBar hidden />
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <PodverseVideoSurfaceView style={StyleSheet.absoluteFill} targetId="fullscreen" />
      </View>
      {pictureInPicture ? null : (
        <VideoCornerChrome
          actionTestID="video-fullscreen-exit"
          bottomInset={insets.bottom + videoCornerChromeInset}
          iconName="contract-outline"
          label={t('media_player.exit_video_full_screen')}
          onAction={exitVideoFullscreen}
          revealTestID="video-fullscreen-tap"
          rightInset={insets.right + videoCornerChromeInset}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    zIndex: 50,
  },
});
