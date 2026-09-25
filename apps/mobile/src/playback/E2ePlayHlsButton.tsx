import { useTranslation } from 'react-i18next';

import { Button } from '../components/primitives';
import { isMobileE2eFromEnv } from '../config/env';
import { E2E_HLS_VOD_ITEM_ID_TEXT } from '../lib/e2e/e2eSeedConstants';
import { usePlaybackSession } from './PlaybackProvider';

/**
 * Starts the seeded VOD HLS playlist item through the real orchestrator. Renders only when
 * `EXPO_PUBLIC_MOBILE_E2E=1`.
 */
export function E2ePlayHlsButton() {
  const { t } = useTranslation();
  const { playItemById } = usePlaybackSession();

  if (!isMobileE2eFromEnv()) {
    return null;
  }

  return (
    <Button
      fullWidth
      label={t('e2e.play_hls')}
      onPress={() => {
        void playItemById(E2E_HLS_VOD_ITEM_ID_TEXT);
      }}
      testID="e2e-play-hls-item"
    />
  );
}
