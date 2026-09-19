import type { NavigationProp, ParamListBase } from '@react-navigation/native';
import { CommonActions, useNavigation } from '@react-navigation/native';
import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import type { AddByRSSResourceData, DTOPlaylist } from '@podverse/helpers';

import { useAuth } from '../../auth/AuthProvider';
import { AppOverlay, OverlayPanel, OverlayScrim } from '../../components/overlay';
import { Button } from '../../components/primitives';
import { playlistRepository } from '../../data';
import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useAccessTier } from '../../membership/useAccessTier';
import { LIBRARY_STACK_ROUTES } from '../../navigation';
import { useTheme } from '../../theme/useTheme';

/**
 * A resource the user wants to insert at the first position in a playlist.
 */
export type AddToPlaylistTarget =
  | { kind: 'item' | 'clip' | 'soundbite'; idText: string; medium: 'av' | 'music' }
  | { kind: 'add-by-rss'; medium: 'av' | 'music'; resourceData: AddByRSSResourceData };

const FIRST_PAGE = 1;

type UseAddToPlaylist = {
  /** Opens the picker for a resource. No-op when unauthenticated. */
  requestAddToPlaylist: (target: AddToPlaylistTarget) => void;
  /** Render once in the host screen tree; drives the picker sheet + notices. */
  addToPlaylistSheet: ReactNode;
};

/**
 * Shared "Add to playlist" affordance (9d.4). Returns an imperative opener plus a bottom-sheet
 * element the caller renders once. The sheet lists owned playlists for the target medium and adds
 * the resource to the top of the selected playlist.
 */
export function useAddToPlaylist(): UseAddToPlaylist {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { evaluateFeature, isTierKnown } = useAccessTier();
  const navigation = useNavigation<NavigationProp<ParamListBase>>();
  const { handleGateError, openGate } = useMembershipGate();

  const [target, setTarget] = useState<AddToPlaylistTarget | null>(null);
  const [playlists, setPlaylists] = useState<DTOPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);

  const authArgs = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const loadPlaylists = useCallback(
    async (nextTarget: AddToPlaylistTarget) => {
      setIsLoading(true);
      setNoticeKey(null);
      try {
        const response = await playlistRepository.listOwned(
          authArgs,
          {
            medium: nextTarget.medium,
            page: FIRST_PAGE,
            range: null,
            sort: 'a_z',
          },
          { refresh: true }
        );
        setPlaylists(response.data);
      } catch {
        setPlaylists([]);
        setNoticeKey('errors.generic');
      } finally {
        setIsLoading(false);
      }
    },
    [authArgs]
  );

  const requestAddToPlaylist = useCallback(
    (next: AddToPlaylistTarget) => {
      if (status !== 'authenticated') {
        return;
      }
      setTarget(next);
      setNoticeKey(null);
      void loadPlaylists(next);
    },
    [loadPlaylists, status]
  );

  const closeSheet = useCallback(() => {
    setTarget(null);
    setNoticeKey(null);
  }, []);

  const addToPlaylist = useCallback(
    async (playlist: DTOPlaylist) => {
      if (target === null || isSaving) {
        return;
      }
      setIsSaving(true);
      setNoticeKey(null);
      try {
        if (target.kind === 'clip') {
          await playlistRepository.addClipFirst(authArgs, playlist.id_text, target.idText);
        } else if (target.kind === 'soundbite') {
          await playlistRepository.addSoundbiteFirst(authArgs, playlist.id_text, target.idText);
        } else if (target.kind === 'add-by-rss') {
          await playlistRepository.addAddByRssFirst(
            authArgs,
            playlist.id_text,
            target.resourceData
          );
        } else {
          await playlistRepository.addItemFirst(authArgs, playlist.id_text, target.idText);
        }
        setNoticeKey('features.playlist.added_to_playlist');
      } catch (error) {
        if (handleGateError(error)) {
          closeSheet();
          return;
        }
        setNoticeKey('features.playlist.add_error');
      } finally {
        setIsSaving(false);
      }
    },
    [authArgs, closeSheet, handleGateError, isSaving, target]
  );

  const canOpenPlaylistCreate = useMemo(() => {
    return navigation.getState().routeNames.includes(LIBRARY_STACK_ROUTES.PlaylistCreate);
  }, [navigation]);

  const handleCreatePlaylist = useCallback(() => {
    if (status !== 'authenticated') {
      openGate('needs_account');
      return;
    }
    if (isTierKnown) {
      const access = evaluateFeature('add_by_rss_add');
      if (!access.allowed) {
        openGate(access.reason);
        return;
      }
    }

    closeSheet();
    navigation.dispatch(CommonActions.navigate({ name: LIBRARY_STACK_ROUTES.PlaylistCreate }));
  }, [closeSheet, evaluateFeature, isTierKnown, navigation, openGate, status]);

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          flex: 1,
          justifyContent: 'flex-end',
        },
        scrim: {
          ...StyleSheet.absoluteFillObject,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
        },
        notice: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
        },
        optionRow: {
          borderTopColor: themeStyles.border.borderColor,
          borderTopWidth: 1,
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
        },
        optionText: {
          color: themeStyles.textPrimary.color,
          fontSize: 16,
        },
        optionsScroll: {
          maxHeight: 320,
        },
        sheet: {
          backgroundColor: themeStyles.screen.backgroundColor,
          borderTopLeftRadius: tokens.radii.md,
          borderTopRightRadius: tokens.radii.md,
          paddingBottom: tokens.spacing['2xl'],
          paddingTop: tokens.spacing.sm,
        },
        sheetActions: {
          gap: tokens.spacing.md,
          paddingHorizontal: tokens.spacing.lg,
          paddingTop: tokens.spacing.md,
        },
        sheetTitle: {
          color: themeStyles.textSecondary.color,
          fontSize: 13,
          fontWeight: '600',
          paddingHorizontal: tokens.spacing.lg,
          paddingVertical: tokens.spacing.md,
        },
      }),
    [themeStyles, tokens]
  );

  const showEmpty = !isLoading && noticeKey === null && playlists.length === 0;

  const addToPlaylistSheet = (
    <AppOverlay animation="slide" onRequestClose={closeSheet} visible={target !== null}>
      <Pressable
        accessibilityLabel={t('misc.close')}
        onPress={closeSheet}
        style={styles.backdrop}
        testID="add-to-playlist-backdrop"
      >
        <OverlayScrim pointerEvents="none" style={styles.scrim} />
        <OverlayPanel>
          <Pressable onPress={stopPropagation} style={styles.sheet} testID="add-to-playlist-sheet">
            <Text style={styles.sheetTitle}>{t('features.playlist.add_to_playlist')}</Text>
            {isLoading ? (
              <Text style={styles.notice} testID="add-to-playlist-loading">
                {t('misc.loading_your_content')}
              </Text>
            ) : null}
            {showEmpty ? (
              <Text style={styles.notice} testID="add-to-playlist-empty">
                {t('features.playlist.my_playlists')}
              </Text>
            ) : null}
            {!isLoading && playlists.length > 0 ? (
              <FlatList
                data={playlists}
                keyExtractor={(playlist) => playlist.id_text}
                renderItem={({ item: playlist }) => (
                  <Pressable
                    accessibilityRole="button"
                    disabled={isSaving}
                    onPress={() => {
                      void addToPlaylist(playlist);
                    }}
                    style={styles.optionRow}
                    testID={`add-to-playlist-option-${playlist.id_text}`}
                  >
                    <Text style={styles.optionText}>{playlist.title ?? playlist.id_text}</Text>
                  </Pressable>
                )}
                style={styles.optionsScroll}
              />
            ) : null}
            {noticeKey !== null ? (
              <Text style={styles.notice} testID="add-to-playlist-notice">
                {t(noticeKey)}
              </Text>
            ) : null}
            <View style={styles.sheetActions}>
              {canOpenPlaylistCreate ? (
                <Button
                  label={t('features.playlist.create_playlist')}
                  onPress={handleCreatePlaylist}
                  testID="add-to-playlist-create"
                  variant="secondary"
                />
              ) : null}
              <Button
                label={t('misc.close')}
                onPress={closeSheet}
                testID="add-to-playlist-close"
                variant="secondary"
              />
            </View>
          </Pressable>
        </OverlayPanel>
      </Pressable>
    </AppOverlay>
  );

  return { addToPlaylistSheet, requestAddToPlaylist };
}
