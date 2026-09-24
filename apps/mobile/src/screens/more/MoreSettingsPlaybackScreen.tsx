import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Switch, Text, View } from 'react-native';

import type { MediaTypePreference } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { syncPlaybackPreferenceToAccount } from '../../auth/syncAccountPrefs';
import { OptionChipGroup } from '../../components/form';
import { Card } from '../../components/primitives/Card';
import { ListRow } from '../../components/primitives/ListRow';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import {
  readAutoQueuePrefs,
  writeAutoQueueRandomPref,
  writeAutoQueueRepeatPref,
} from '../../prefs/autoQueuePrefs';
import {
  DEFAULT_PLAYBACK_MEDIA_TYPE,
  readPlaybackMediaTypePref,
  writePlaybackMediaTypePref,
} from '../../prefs/preferredMediaType';
import { useTheme } from '../../theme/useTheme';

const PLAYBACK_MEDIA_OPTIONS: readonly MediaTypePreference[] = ['video', 'audio'];

export function MoreSettingsPlaybackScreen() {
  const { t } = useTranslation();
  const { accessToken, clearSession, refreshToken, setAccount, setTokens } = useAuth();
  const { styles: themeStyles, tokens } = useTheme();
  const [playbackMediaType, setPlaybackMediaType] = useState<MediaTypePreference>(
    DEFAULT_PLAYBACK_MEDIA_TYPE
  );
  const [autoQueueRandom, setAutoQueueRandom] = useState<boolean>(false);
  const [autoQueueRepeat, setAutoQueueRepeat] = useState<boolean>(false);
  const [errorMessageKey, setErrorMessageKey] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void (async () => {
      const [storedPlaybackMediaType, autoQueuePrefs] = await Promise.all([
        readPlaybackMediaTypePref(),
        readAutoQueuePrefs(),
      ]);

      if (!isMounted) {
        return;
      }

      setPlaybackMediaType(storedPlaybackMediaType);
      setAutoQueueRandom(autoQueuePrefs.random);
      setAutoQueueRepeat(autoQueuePrefs.repeat);
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  const handlePlaybackMediaTypeChange = useCallback(
    async (mediaType: MediaTypePreference) => {
      setErrorMessageKey(null);
      setPlaybackMediaType(mediaType);
      try {
        await writePlaybackMediaTypePref(mediaType);
        await syncPlaybackPreferenceToAccount({
          auth: { accessToken, clearSession, refreshToken, setTokens },
          preferredMediaType: mediaType,
          setAccount,
        });
      } catch {
        setErrorMessageKey('errors.generic');
      }
    },
    [accessToken, clearSession, refreshToken, setAccount, setTokens]
  );

  const handleAutoQueueRandomToggle = useCallback(async (enabled: boolean) => {
    setAutoQueueRandom(enabled);
    await writeAutoQueueRandomPref(enabled);
  }, []);

  const handleAutoQueueRepeatToggle = useCallback(async (enabled: boolean) => {
    setAutoQueueRepeat(enabled);
    await writeAutoQueueRepeatPref(enabled);
  }, []);

  const playbackMediaOptions = useMemo(
    () =>
      PLAYBACK_MEDIA_OPTIONS.map((mediaTypeOption) => ({
        label: t(`settings.preferred_media_type.${mediaTypeOption}`),
        testID: `more-settings-playback-${mediaTypeOption}`,
        value: mediaTypeOption,
      })),
    [t]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        cardStack: {
          gap: tokens.spacing.xl,
        },
        sectionDescription: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.xs,
        },
        sectionHeading: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
          fontWeight: '700',
          marginBottom: tokens.spacing.xs,
        },
        sectionInner: {
          padding: tokens.spacing.lg,
        },
        sectionStack: {
          marginTop: tokens.spacing.md,
        },
        sectionStackAfterDescription: {
          marginTop: tokens.spacing.lg,
        },
        warningText: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.sm,
        },
      }),
    [themeStyles, tokens]
  );

  return (
    <MobileScreenContainer testID="more-settings-playback-screen">
      <View style={styles.cardStack}>
        <Card padded={false} testID="more-settings-playback-card">
          <View style={styles.sectionInner}>
            <Text style={styles.sectionHeading}>{t('settings.preferred_media_type.label')}</Text>
            <Text style={styles.sectionDescription}>
              {t('settings.preferred_media_type.description')}
            </Text>
            <View style={styles.sectionStackAfterDescription}>
              <OptionChipGroup
                onChange={(mediaType) => {
                  void handlePlaybackMediaTypeChange(mediaType);
                }}
                options={playbackMediaOptions}
                testID="more-settings-playback-chips"
                value={playbackMediaType}
              />
            </View>
          </View>
        </Card>

        <Card padded={false} testID="more-settings-auto-queue-card">
          <View style={styles.sectionInner}>
            <Text style={styles.sectionHeading}>{t('media_player.auto_queue')}</Text>
            <View style={styles.sectionStack}>
              <ListRow
                testID="more-settings-auto-queue-random"
                title={t('media_player.shuffle.toggle_shuffle')}
                trailing={
                  <Switch
                    onValueChange={(nextValue) => {
                      void handleAutoQueueRandomToggle(nextValue);
                    }}
                    value={autoQueueRandom}
                  />
                }
              />
            </View>
            <View style={styles.sectionStack}>
              <ListRow
                testID="more-settings-auto-queue-repeat"
                title={t('media_player.repeat.toggle_repeat')}
                trailing={
                  <Switch
                    onValueChange={(nextValue) => {
                      void handleAutoQueueRepeatToggle(nextValue);
                    }}
                    value={autoQueueRepeat}
                  />
                }
              />
            </View>
          </View>
        </Card>

        {errorMessageKey !== null ? (
          <Text style={styles.warningText} testID="more-settings-error">
            {t(errorMessageKey)}
          </Text>
        ) : null}
      </View>
    </MobileScreenContainer>
  );
}
