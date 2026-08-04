import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import type { DTOPlaylist } from '@podverse/helpers';
import { SharableStatusEnum } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/primitives';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';

type PlaylistFormScreenProps = NativeStackScreenProps<
  LibraryStackParamList,
  'PlaylistCreate' | 'PlaylistEdit'
>;

// Functional sketch (9d.1 / 9d.2): mobile playlists default to the AV medium like the web create
// form's default. A medium picker is deferred to operator polish (Track 23) — not required here.
const CREATE_MEDIUM = 'av';

const SHARABLE_STATUS_OPTIONS: { id: SharableStatusEnum; labelKey: string; testId: string }[] = [
  {
    id: SharableStatusEnum.Public,
    labelKey: 'misc.sharable_status.public',
    testId: 'playlist-form-sharable-public',
  },
  {
    id: SharableStatusEnum.Unlisted,
    labelKey: 'misc.sharable_status.unlisted',
    testId: 'playlist-form-sharable-unlisted',
  },
  {
    id: SharableStatusEnum.Private,
    labelKey: 'misc.sharable_status.private',
    testId: 'playlist-form-sharable-private',
  },
];

export function PlaylistFormScreen({ navigation, route }: PlaylistFormScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { account, accessToken, clearSession, refreshToken, setTokens, status } = useAuth();

  const params = route.params;
  const editPlaylistId = params !== undefined && 'playlistId' in params ? params.playlistId : null;
  const isEdit = editPlaylistId !== null;

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [sharableStatusId, setSharableStatusId] = useState<SharableStatusEnum>(
    SharableStatusEnum.Private
  );
  const [isLoading, setIsLoading] = useState<boolean>(isEdit);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(!isEdit);

  const authArgs = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
        chip: {
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.round,
          borderWidth: 1,
          marginRight: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        chipRow: {
          flexDirection: 'row',
          flexWrap: 'wrap',
          marginTop: tokens.spacing.sm,
        },
        chipSelected: {
          backgroundColor: tokens.button.primaryBg,
          borderColor: tokens.button.primaryBg,
        },
        chipLabel: {
          color: themeStyles.textPrimary.color,
          fontSize: 13,
          fontWeight: '600',
        },
        chipLabelSelected: {
          color: tokens.button.primaryColor,
        },
        actions: {
          flexDirection: 'row',
          gap: tokens.spacing.md,
          marginTop: tokens.spacing.xl,
        },
        error: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          marginTop: tokens.spacing.md,
        },
        input: {
          backgroundColor: themeStyles.screen.backgroundColor,
          borderColor: themeStyles.border.borderColor,
          borderRadius: tokens.radii.md,
          borderWidth: 1,
          color: themeStyles.textPrimary.color,
          fontSize: 14,
          marginTop: tokens.spacing.sm,
          paddingHorizontal: tokens.spacing.md,
          paddingVertical: tokens.spacing.sm,
        },
        inputMultiline: {
          minHeight: 88,
          textAlignVertical: 'top',
        },
        label: {
          color: themeStyles.textPrimary.color,
          fontSize: 15,
          fontWeight: '600',
          marginTop: tokens.spacing.lg,
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 14,
          marginTop: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const loadPlaylist = useCallback(async () => {
    if (editPlaylistId === null) {
      return;
    }
    if (status !== 'authenticated') {
      setIsOwner(false);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorKey(null);
    try {
      const playlist: DTOPlaylist = await requestWithMobileAuthRefresh(authArgs, async (api) =>
        api.reqPlaylistGet(editPlaylistId)
      );
      const ownerIdText = playlist.account?.id_text;
      const owns = ownerIdText !== undefined && ownerIdText === account?.id_text;
      setIsOwner(owns);
      if (owns) {
        setTitle(playlist.title ?? '');
        setDescription(playlist.description ?? '');
        setSharableStatusId(playlist.sharable_status_id);
      }
    } catch {
      setErrorKey('errors.generic');
      setIsOwner(false);
    } finally {
      setIsLoading(false);
    }
  }, [account?.id_text, authArgs, editPlaylistId, status]);

  useEffect(() => {
    void loadPlaylist();
  }, [loadPlaylist]);

  const trimmedTitle = title.trim();
  const canSubmit = status === 'authenticated' && trimmedTitle.length > 0 && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) {
      return;
    }
    const nextDescription = description.trim().length > 0 ? description.trim() : undefined;

    setIsSubmitting(true);
    setErrorKey(null);
    try {
      if (editPlaylistId !== null) {
        await requestWithMobileAuthRefresh(authArgs, async (api) =>
          api.reqPlaylistEdit({
            description: nextDescription,
            id_text: editPlaylistId,
            sharable_status_id: sharableStatusId,
            title: trimmedTitle,
          })
        );
        navigation.goBack();
        return;
      }

      const created: DTOPlaylist = await requestWithMobileAuthRefresh(authArgs, async (api) =>
        api.reqPlaylistCreate({
          description: nextDescription,
          medium: CREATE_MEDIUM,
          sharable_status_id: sharableStatusId,
          title: trimmedTitle,
        })
      );
      navigation.replace(LIBRARY_STACK_ROUTES.PlaylistDetail, { playlistId: created.id_text });
    } catch {
      setErrorKey('errors.generic');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    authArgs,
    canSubmit,
    description,
    editPlaylistId,
    navigation,
    sharableStatusId,
    trimmedTitle,
  ]);

  const heading = isEdit
    ? t('features.playlist.edit_playlist')
    : t('features.playlist.create_playlist');

  if (status !== 'authenticated') {
    return (
      <MobileScreenContainer heading={heading} testID="playlist-form-screen">
        <Text style={styles.notice} testID="playlist-form-auth-required">
          {t('authentication.login_required')}
        </Text>
      </MobileScreenContainer>
    );
  }

  if (isEdit && isLoading) {
    return (
      <MobileScreenContainer heading={heading} testID="playlist-form-screen">
        <Text style={styles.notice} testID="playlist-form-loading">
          {t('misc.loading_your_content')}
        </Text>
      </MobileScreenContainer>
    );
  }

  if (isEdit && !isOwner) {
    return (
      <MobileScreenContainer heading={heading} testID="playlist-form-screen">
        <Text style={styles.notice} testID="playlist-form-not-owner">
          {errorKey !== null ? t(errorKey) : t('errors.generic')}
        </Text>
        <View style={styles.actions}>
          <Button
            label={t('misc.go_back')}
            onPress={() => {
              navigation.goBack();
            }}
            testID="playlist-form-cancel"
            variant="secondary"
          />
        </View>
      </MobileScreenContainer>
    );
  }

  return (
    <MobileScreenContainer heading={heading} testID="playlist-form-screen">
      <Text style={styles.label}>{t('misc.title')}</Text>
      <TextInput
        onChangeText={setTitle}
        placeholder={t('misc.title')}
        style={styles.input}
        testID="playlist-form-title"
        value={title}
      />

      <Text style={styles.label}>{`${t('misc.description')} (${t('misc.optional')})`}</Text>
      <TextInput
        multiline
        onChangeText={setDescription}
        placeholder={t('misc.description')}
        style={[styles.input, styles.inputMultiline]}
        testID="playlist-form-description"
        value={description}
      />

      <Text style={styles.label}>{t('features.playlist.playlist_type')}</Text>
      <View style={styles.chipRow}>
        {SHARABLE_STATUS_OPTIONS.map((option) => {
          const selected = option.id === sharableStatusId;
          return (
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              key={option.id}
              onPress={() => {
                setSharableStatusId(option.id);
              }}
              style={[styles.chip, selected ? styles.chipSelected : null]}
              testID={option.testId}
            >
              <Text style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}>
                {t(option.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {errorKey !== null ? (
        <Text style={styles.error} testID="playlist-form-error">
          {t(errorKey)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          disabled={!canSubmit}
          label={isSubmitting ? t('misc.saving') : t('misc.save')}
          loading={isSubmitting}
          onPress={() => {
            void handleSubmit();
          }}
          testID="playlist-form-submit"
        />
        <Button
          label={t('misc.cancel')}
          onPress={() => {
            navigation.goBack();
          }}
          testID="playlist-form-cancel"
          variant="secondary"
        />
      </View>
    </MobileScreenContainer>
  );
}
