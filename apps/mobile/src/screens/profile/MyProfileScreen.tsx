import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text } from 'react-native';

import { useAuth } from '../../auth/AuthProvider';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { SectionCard } from '../../components/section/SectionCard';
import { AuthAwareLoadState } from '../../components/state/AuthAwareLoadState';
import { useMyProfileContentLoad } from '../../hooks/useProfileContentLoad';
import type { MoreStackParamList } from '../../navigation';
import { MORE_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';
import { ProfileContentSections } from './ProfileContentSections';

type MyProfileScreenProps = NativeStackScreenProps<MoreStackParamList, 'MoreProfile'>;

export function MyProfileScreen({ navigation }: MyProfileScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { account, status } = useAuth();
  const { content, errorKey, isLoading, reload } = useMyProfileContentLoad();

  const styles = useMemo(
    () =>
      StyleSheet.create({
        profileButton: {
          alignSelf: 'flex-start',
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          marginTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.xs,
        },
        profileButtonLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 13,
          fontWeight: '600',
        },
      }),
    [themeStyles, tokens]
  );

  const profileTitle =
    account?.account_profile?.display_name ?? account?.id_text ?? t('features.my_profile');

  return (
    <MobileScreenContainer heading={profileTitle} testID="my-profile-screen">
      <AuthAwareLoadState
        emptyTestID="my-profile-auth-required"
        errorKey={errorKey}
        errorTestID="my-profile-error"
        isLoading={isLoading}
        loadingTestID="my-profile-loading"
        onRetry={() => {
          void reload();
        }}
        showAuthRequired={status !== 'authenticated'}
      >
        <>
          <SectionCard heading={t('features.my_profile')}>
            {account?.id_text ? (
              <Pressable
                onPress={() => {
                  navigation.navigate(MORE_STACK_ROUTES.MorePublicProfile, {
                    accountIdText: account.id_text,
                  });
                }}
                style={styles.profileButton}
                testID="my-profile-open-public"
              >
                <Text style={styles.profileButtonLabel}>{t('features.profile')}</Text>
              </Pressable>
            ) : null}
          </SectionCard>

          <ProfileContentSections
            albums={content.albums}
            clips={content.clips}
            emptyTestIdPrefix="my-profile"
            playlistVariant="plain"
            playlists={content.playlists}
            podcasts={content.podcasts}
          />
        </>
      </AuthAwareLoadState>
    </MobileScreenContainer>
  );
}
