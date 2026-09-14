import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { HelperNote } from '../../components/feedback/HelperNote';
import { Button } from '../../components/primitives';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { E2ePlayVideoButton } from '../../playback/E2ePlayVideoButton';
import { usePlayback } from '../../playback/PlaybackProvider';
import { useTheme } from '../../theme/useTheme';

/**
 * E2E-only playback harness. Product screens do not grow fixture buttons; Maestro reaches seeded
 * video play and skip-next from this More page instead.
 */
export function MoreE2ePlaybackScreen() {
  const { t } = useTranslation();
  const { tokens } = useTheme();
  const { activeTarget, skipToNext } = usePlayback();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        stack: {
          gap: tokens.spacing.lg,
        },
      }),
    [tokens]
  );

  return (
    <MobileScreenContainer testID="more-e2e-playback-screen">
      <View style={styles.stack}>
        <HelperNote message={t('e2e.playback_intro')} testID="more-e2e-playback-intro" />
        <E2ePlayVideoButton />
        <Button
          disabled={activeTarget === null}
          fullWidth
          label={t('e2e.skip_next')}
          onPress={() => {
            void skipToNext();
          }}
          testID="playback-skip-next-e2e"
        />
      </View>
    </MobileScreenContainer>
  );
}
