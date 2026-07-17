import type { NativeStackScreenProps } from '@react-navigation/native-stack';

import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { usePublicProfileContentLoad } from '../../hooks/useProfileContentLoad';
import type { MoreStackParamList } from '../../navigation';
import { ProfileContentSections } from './ProfileContentSections';

type ProfileScreenProps = NativeStackScreenProps<MoreStackParamList, 'MorePublicProfile'>;

export function ProfileScreen({ route }: ProfileScreenProps) {
  const { accountIdText } = route.params;
  const { content, displayName, errorKey, isLoading, reload } =
    usePublicProfileContentLoad(accountIdText);

  return (
    <MobileScreenContainer heading={displayName ?? accountIdText} testID="profile-screen">
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
