import type { ParamListBase } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { ListEmpty } from '../../components/state/ListEmpty';
import { usePublicProfileContentLoad } from '../../hooks/useProfileContentLoad';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import { useOfflineMode } from '../../prefs/offlineMode';
import { screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import { openProfileStackContent } from './openProfileStackContent';
import { ProfileContentSections } from './ProfileContentSections';
import { ProfileIdentity } from './ProfileIdentity';

type ProfileScreenProps = {
  navigation: NativeStackNavigationProp<ParamListBase>;
  route: { params: { accountIdText: string } };
};

export function ProfileScreen({ navigation, route }: ProfileScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accountIdText } = route.params;
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { bio, content, displayName, errorKey, isLoading, reload } =
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

  const trimmedName = displayName?.trim();
  const headerTitle =
    trimmedName !== undefined && trimmedName.length > 0 ? trimmedName : t('misc.anonymous');

  const handleShare = useCallback(() => {
    shareResolvedUrl(buildPublicShareUrl('profile', accountIdText));
  }, [accountIdText]);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <HeaderBarAction
          accessibilityLabel={t('features.share')}
          icon="share-outline"
          onPress={handleShare}
          testID="profile-share"
        />
      ),
      title: headerTitle,
    });
  }, [handleShare, headerTitle, navigation, t]);

  const handleRetry = useCallback(() => {
    void reload();
  }, [reload]);

  const listHeader = useMemo(() => {
    if (bio === null) {
      return undefined;
    }
    return <ProfileIdentity bio={bio} testID="profile-bio" />;
  }, [bio]);

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
          onContentPress={(request) => {
            openProfileStackContent(navigation, request);
          }}
          playlists={content.playlists}
          podcasts={content.podcasts}
        />
      </AuthAwareLoadState>
    </View>
  );
}
