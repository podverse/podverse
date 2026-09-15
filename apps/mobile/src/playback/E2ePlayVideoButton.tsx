import { useTranslation } from 'react-i18next';

import { Button } from '../components/primitives';
import { isMobileE2eFromEnv } from '../config/env';
import { E2E_VIDEO_ITEM_ID_TEXT } from '../lib/e2e/e2eSeedConstants';
import { usePlayback } from './PlaybackProvider';

/**
 * Starts the seeded video-medium item through the real orchestrator so the mini player shows an
 * `item-video` target. Renders only when `EXPO_PUBLIC_MOBILE_E2E=1`.
 */
export function E2ePlayVideoButton() {
  const { t } = useTranslation();
  const { playItemById } = usePlayback();

  if (!isMobileE2eFromEnv()) {
    return null;
  }

  return (
    <Button
      fullWidth
      label={t('e2e.play_video')}
      onPress={() => {
        void playItemById(E2E_VIDEO_ITEM_ID_TEXT);
      }}
      testID="e2e-play-video-item"
    />
  );
}
