import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '../../components/primitives/Button';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { usePublicProfileContentLoad } from '../../hooks/useProfileContentLoad';
import { buildPublicShareUrl, shareResolvedUrl } from '../../lib/share/shareNowPlaying';
import type { MoreStackParamList } from '../../navigation';
import { ProfileContentSections } from './ProfileContentSections';

type ProfileScreenProps = NativeStackScreenProps<MoreStackParamList, 'MorePublicProfile'>;

export function ProfileScreen({ navigation, route }: ProfileScreenProps) {
  const { t } = useTranslation();
  const { accountIdText } = route.params;
  const { content, displayName, errorKey, isLoading, reload } =
    usePublicProfileContentLoad(accountIdText);

  const headerTitle = displayName ?? accountIdText;

  useLayoutEffect(() => {
    navigation.setOptions({ title: headerTitle });
  }, [headerTitle, navigation]);

  const handleShare = useCallback(() => {
    shareResolvedUrl(buildPublicShareUrl('profile', accountIdText));
  }, [accountIdText]);

  return (
    <MobileScreenContainer testID="profile-screen">
      <Button
        label={t('features.share')}
        onPress={handleShare}
        size="sm"
        testID="profile-share"
        variant="secondary"
      />
      <AuthAwareLoadState
        errorKey={errorKey}
        errorTestID="profile-error"
        isLoading={isLoading}
        loadingTestID="profile-loading"
        onRetry={() => {
          void reload();
        }}
      >
        <ProfileContentSections
          albums={content.albums}
          clips={content.clips}
          emptyTestIdPrefix="profile"
          playlistVariant="card"
          playlists={content.playlists}
          podcasts={content.podcasts}
        />
      </AuthAwareLoadState>
    </MobileScreenContainer>
  );
}
