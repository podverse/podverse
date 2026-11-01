import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { HeaderBarAction } from '../../components/screen/HeaderBarAction';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { ListEmpty } from '../../components/state/ListEmpty';
import { useMyProfileContentLoad } from '../../hooks/useProfileContentLoad';
import { OFFLINE_UNAVAILABLE_MESSAGE_KEY } from '../../lib/offlineModeViews';
import { profileBio } from '../../lib/rows/catalogRowCopy';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import { useOfflineMode } from '../../prefs/offlineMode';
import { screenBodyInsets } from '../../theme/screenLayout';
import { useTheme } from '../../theme/useTheme';
import { openProfileStackContent } from './openProfileStackContent';
import { ProfileContentSections } from './ProfileContentSections';
import { ProfileIdentity } from './ProfileIdentity';

type MyProfileScreenProps = NativeStackScreenProps<MoreStackParamList, 'MoreProfile'>;

export function MyProfileScreen({ navigation }: MyProfileScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { account, status } = useAuth();
  const { enabled: offlineModeEnabled } = useOfflineMode();
  const { content, errorKey, isLoading, reload } = useMyProfileContentLoad();

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

  const displayName = account?.account_profile?.display_name?.trim();
  const profileHeading =
    displayName !== undefined && displayName.length > 0 ? displayName : t('misc.anonymous');
  const bio = account === null ? null : profileBio(account);
  const canEdit = status === 'authenticated' && account !== null && !offlineModeEnabled;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () =>
        canEdit ? (
          <HeaderBarAction
            accessibilityLabel={t('misc.edit')}
            label={t('misc.edit')}
            onPress={() => {
              navigation.navigate(MORE_STACK_ROUTES.MoreProfileEdit);
            }}
            testID="my-profile-edit"
          />
        ) : null,
      title: t('features.my_profile'),
    });
  }, [canEdit, navigation, t]);

  const handleRetry = useCallback(() => {
    void reload();
  }, [reload]);

  const listHeader = useMemo(
    () => <ProfileIdentity bio={bio} name={profileHeading} testID="my-profile-bio" />,
    [bio, profileHeading]
  );

  if (offlineModeEnabled) {
    return (
      <View style={styles.screen} testID="my-profile-screen">
        <ListEmpty
          messageKey={OFFLINE_UNAVAILABLE_MESSAGE_KEY}
          testID="my-profile-offline-unavailable"
        />
      </View>
    );
  }

  return (
    <View style={styles.screen} testID="my-profile-screen">
      <AuthAwareLoadState
        emptyTestID="my-profile-auth-required"
        errorKey={errorKey}
        errorTestID="my-profile-error"
        isLoading={isLoading}
        loadingTestID="my-profile-loading"
        onRetry={handleRetry}
        showAuthRequired={status !== 'authenticated'}
      >
        <ProfileContentSections
          albums={content.albums}
          clips={content.clips}
          emptyTestIdPrefix="my-profile"
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
