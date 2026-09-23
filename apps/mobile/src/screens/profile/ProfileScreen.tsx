import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button } from '../../components/primitives/Button';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { ListEmpty } from '../../components/state/ListEmpty';
import { usePublicProfileContentLoad } from '../../hooks/useProfileContentLoad';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { useOfflineMode } from '../../prefs/offlineMode';
import { screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import { ProfileContentSections } from './ProfileContentSections';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
  route: { params: { accountIdText: string } };
};

export function ProfileScreen({ navigation, route }: ProfileScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accountIdText } = route.params;
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { content, displayName, errorKey, isLoading, reload } =
    usePublicProfileContentLoad(accountIdText);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        screen: {
          backgroundColor: themeStyles.screen.backgroundColor,
          flex: 1,
          paddingBottom: tokens.spacing['2xl'],
          ...screenBodyInsets(tokens.spacing),
        },
      }),
    [themeStyles, tokens]
  );

  const headerTitle = displayName ?? accountIdText;

  useLayoutEffect(() => {
    navigation.setOptions({ title: headerTitle });
  }, [headerTitle, navigation]);

  const handleShare = useCallback(() => {
    shareResolvedUrl(buildPublicShareUrl('profile', accountIdText));
  }, [accountIdText]);

  const handleRetry = useCallback(() => {
    void reload();
  }, [reload]);

  const listHeader = useMemo(
    () => (
      <Button
        label={t('features.share')}
        onPress={handleShare}
        size="sm"
        testID="profile-share"
        variant="secondary"
      />
    ),
    [handleShare, t]
  );

  if (offlineModeEnabled) {
    return (
      <View style={styles.screen} testID="profile-screen">
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="profile-offline-unavailable"
        />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="profile-screen">
      <AuthAwareLoadState
        errorKey={errorKey}
        errorTestID="profile-error"
        isLoading={isLoading}
        loadingTestID="profile-loading"
        onRetry={handleRetry}
      >
        <ProfileContentSections
          albums={content.albums}
          clips={content.clips}
          emptyTestIdPrefix="profile"
          header={listHeader}
          onPlaylistPress={(playlistId) => {
            navigation.navigate('PlaylistDetail', { playlistId });
          }}
          playlists={content.playlists}
          podcasts={content.podcasts}
        />
      </AuthAwareLoadState>
    </View>
  );
}
