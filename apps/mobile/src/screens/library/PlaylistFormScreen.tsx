import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { QueryParamsQueueMedium } from '@podverse/helpers';
import { MediumEnum, SharableStatusEnum } from '@podverse/helpers';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import { ConfirmDialog } from '../../components/feedback/ConfirmDialog';
import { OptionChipGroup, TextField } from '../../components/form';
import { Button } from '../../components/primitives';
import { MobileScreenContainer } from '../../components/screen/MobileScreenContainer';
import { CallToActionSection } from '../../components/state/CallToActionSection';
import { LoadingSection } from '../../components/state/LoadingSection';
import { playlistRepository } from '../../data';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import type { LibraryStackParamList } from '../../navigation';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';

type PlaylistFormScreenProps = NativeStackScreenProps<
  LibraryStackParamList,
  'PlaylistCreate' | 'PlaylistEdit'
>;

const CREATE_MEDIUM: QueryParamsQueueMedium = 'av';
const MUSIC_MEDIUM: QueryParamsQueueMedium = 'music';

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

const PLAYLIST_MEDIUM_OPTIONS: {
  labelKey: string;
  testId: string;
  value: QueryParamsQueueMedium;
}[] = [
  {
    labelKey: 'media.podcast.podcasts',
    testId: 'playlist-form-medium-av',
    value: CREATE_MEDIUM,
  },
  {
    labelKey: 'media.music.music',
    testId: 'playlist-form-medium-music',
    value: MUSIC_MEDIUM,
  },
];

export function PlaylistFormScreen({ navigation, route }: PlaylistFormScreenProps) {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { onRequestLogin } = useAuthPrompt();
  const { account, accessToken, clearSession, refreshToken, setTokens, status } = useAuth();

  const params = route.params;
  const editPlaylistId = params !== undefined && 'playlistId' in params ? params.playlistId : null;
  const isEdit = editPlaylistId !== null;

  const [title, setTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [medium, setMedium] = useState<QueryParamsQueueMedium>(CREATE_MEDIUM);
  const [sharableStatusId, setSharableStatusId] = useState<SharableStatusEnum>(
    SharableStatusEnum.Private
  );
  const [isLoading, setIsLoading] = useState<boolean>(isEdit);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<boolean>(false);
  const [errorKey, setErrorKey] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState<boolean>(!isEdit);

  const authArgs = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const styles = useMemo(
    () =>
      StyleSheet.create({
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
        field: {
          marginTop: tokens.spacing.md,
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
      const playlist: DTOPlaylist = await playlistRepository.getByIdText(authArgs, editPlaylistId, {
        refresh: true,
      });
      const ownerIdText = playlist.account?.id_text;
      const owns = ownerIdText !== undefined && ownerIdText === account?.id_text;
      setIsOwner(owns);
      if (owns) {
        setTitle(playlist.title ?? '');
        setDescription(playlist.description ?? '');
        setSharableStatusId(playlist.sharable_status_id);
        setMedium(playlist.medium_id === MediumEnum.Music ? MUSIC_MEDIUM : CREATE_MEDIUM);
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

  const { handleGateError } = useMembershipGate();
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
        await playlistRepository.edit(authArgs, {
          description: nextDescription,
          id_text: editPlaylistId,
          sharable_status_id: sharableStatusId,
          title: trimmedTitle,
        });
        navigation.goBack();
        return;
      }

      const created: DTOPlaylist = await playlistRepository.create(authArgs, {
        description: nextDescription,
        medium,
        sharable_status_id: sharableStatusId,
        title: trimmedTitle,
      });
      const routeNames = navigation.getState().routeNames;
      if (routeNames.includes(LIBRARY_STACK_ROUTES.PlaylistDetail)) {
        navigation.replace(LIBRARY_STACK_ROUTES.PlaylistDetail, { playlistId: created.id_text });
      } else {
        navigation.goBack();
      }
    } catch (error) {
      if (handleGateError(error)) {
        return;
      }
      setErrorKey('errors.generic');
    } finally {
      setIsSubmitting(false);
    }
  }, [
    authArgs,
    canSubmit,
    description,
    editPlaylistId,
    handleGateError,
    medium,
    navigation,
    sharableStatusId,
    trimmedTitle,
  ]);

  const handleDelete = useCallback(async () => {
    if (editPlaylistId === null || isDeleting) {
      return;
    }
    setIsDeleting(true);
    setErrorKey(null);
    try {
      await playlistRepository.delete(authArgs, editPlaylistId);
      navigation.navigate(LIBRARY_STACK_ROUTES.LibraryPlaylists);
    } catch (error) {
      if (handleGateError(error)) {
        setShowDeleteConfirm(false);
        return;
      }
      setErrorKey('errors.generic');
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [authArgs, editPlaylistId, handleGateError, isDeleting, navigation]);

  const heading = isEdit
    ? t('features.playlist.edit_playlist')
    : t('features.playlist.create_playlist');
  const mediumOptions = PLAYLIST_MEDIUM_OPTIONS.map((option) => ({
    label: t(option.labelKey),
    testID: option.testId,
    value: option.value,
  }));
  const sharableOptions = SHARABLE_STATUS_OPTIONS.map((option) => ({
    label: t(option.labelKey),
    testID: option.testId,
    value: option.id,
  }));

  if (status !== 'authenticated') {
    return (
      <MobileScreenContainer testID="playlist-form-screen">
        <CallToActionSection
          actionLabelKey="authentication.login"
          messageKey="authentication.login_required"
          onAction={onRequestLogin}
          testID="playlist-form-auth-required"
        />
      </MobileScreenContainer>
    );
  }

  if (isEdit && isLoading) {
    return (
      <MobileScreenContainer testID="playlist-form-screen">
        <LoadingSection testID="playlist-form-loading" />
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
      <TextField
        accessibilityLabel={t('misc.title')}
        eyebrow={t('misc.title')}
        onChangeText={setTitle}
        placeholder={t('misc.required')}
        testID="playlist-form-title"
        value={title}
      />

      <TextField
        accessibilityLabel={t('misc.description')}
        eyebrow={t('misc.description')}
        multiline
        onChangeText={setDescription}
        placeholder={t('misc.optional')}
        style={styles.field}
        testID="playlist-form-description"
        value={description}
      />

      <Text style={styles.label}>{t('media.podcast.podcasts')}</Text>
      {!isEdit ? (
        <OptionChipGroup
          onChange={setMedium}
          options={mediumOptions}
          testID="playlist-form-medium-chips"
          value={medium}
        />
      ) : (
        <Text style={styles.notice} testID="playlist-form-medium-readonly">
          {t(medium === MUSIC_MEDIUM ? 'media.music.music' : 'media.podcast.podcasts')}
        </Text>
      )}

      <Text style={styles.label}>{t('misc.sharable_status.sharable_status')}</Text>
      <OptionChipGroup
        onChange={setSharableStatusId}
        options={sharableOptions}
        testID="playlist-form-sharable-chips"
        value={sharableStatusId}
      />

      {errorKey !== null ? (
        <Text style={styles.error} testID="playlist-form-error">
          {t(errorKey)}
        </Text>
      ) : null}

      <View style={styles.actions}>
        <Button
          disabled={!canSubmit || isDeleting}
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
      {isEdit ? (
        <View style={styles.actions}>
          <Button
            disabled={isDeleting || isSubmitting}
            label={t('features.playlist.delete_playlist')}
            loading={isDeleting}
            onPress={() => {
              setShowDeleteConfirm(true);
            }}
            testID="playlist-form-delete"
            variant="danger"
          />
        </View>
      ) : null}
      <ConfirmDialog
        body={t('features.playlist.delete_playlist_confirm')}
        cancelLabel={t('misc.cancel')}
        cancelTestID="playlist-form-delete-cancel"
        confirmLabel={t('features.playlist.delete_playlist')}
        confirmTestID="playlist-form-delete-confirm"
        onCancel={() => {
          setShowDeleteConfirm(false);
        }}
        onConfirm={() => {
          void handleDelete();
        }}
        testID="playlist-form-delete-confirm-dialog"
        title={t('features.playlist.delete_playlist')}
        visible={showDeleteConfirm}
      />
    </MobileScreenContainer>
  );
}
