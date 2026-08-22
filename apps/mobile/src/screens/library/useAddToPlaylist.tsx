import type { ReactNode } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import type { DTOPlaylist } from '@podverse/helpers';

import { requestWithMobileAuthRefresh } from '../../auth';
import { useAuth } from '../../auth/AuthProvider';
import { Button } from '../../components/primitives';
import { stopPropagation } from '../../lib/gesture/stopPropagation';
import { useMembershipGate } from '../../membership/MembershipGateProvider';
import { useTheme } from '../../theme/useTheme';

/**
 * A resource the user wants to append to a playlist. `kind` selects the correct playlist-resource
 * API (item vs clip); mobile only sketches the two playable kinds that Home / detail lists expose
 * today (9d.4). Soundbite / add-by-RSS add-to-playlist is deferred to operator polish (Track 23).
 */
export type AddToPlaylistTarget = { kind: 'item' | 'clip'; idText: string };

const FIRST_PAGE = 1;

type UseAddToPlaylist = {
  /** Opens the picker for a resource. No-op when unauthenticated. */
  requestAddToPlaylist: (target: AddToPlaylistTarget) => void;
  /** Render once in the host screen tree; drives the picker sheet + notices. */
  addToPlaylistSheet: ReactNode;
};

/**
 * Shared "Add to playlist" affordance (9d.4). Returns an imperative opener plus a bottom-sheet
 * element the caller renders once. The sheet lists the account's private playlists and appends the
 * target to the chosen playlist via the `*AddLast` resource API (web-default position). Functional
 * sketch only — polished modal chrome / medium filtering is Track 23. Copy resolves through i18n
 * (`features.playlist.*`); errors are surfaced (no silent catch).
 */
export function useAddToPlaylist(): UseAddToPlaylist {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { handleGateError } = useMembershipGate();

  const [target, setTarget] = useState<AddToPlaylistTarget | null>(null);
  const [playlists, setPlaylists] = useState<DTOPlaylist[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);

  const authArgs = useMemo(
    () => ({ accessToken, clearSession, refreshToken, setTokens }),
    [accessToken, clearSession, refreshToken, setTokens]
  );

  const loadPlaylists = useCallback(async () => {
    setIsLoading(true);
    setNoticeKey(null);
    try {
      const response = await requestWithMobileAuthRefresh(authArgs, async (api) =>
        api.reqPlaylistGetMany({
          medium: 'all',
          page: FIRST_PAGE,
          range: null,
          sort: 'recent',
          type: 'private',
        })
      );
      setPlaylists(response.data);
    } catch {
      setPlaylists([]);
      setNoticeKey('errors.generic');
    } finally {
      setIsLoading(false);
    }
  }, [authArgs]);

  const requestAddToPlaylist = useCallback(
    (next: AddToPlaylistTarget) => {
      if (status !== 'authenticated') {
        return;
      }
      setTarget(next);
      setNoticeKey(null);
      void loadPlaylists();
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
        await requestWithMobileAuthRefresh(authArgs, async (api) =>
          target.kind === 'clip'
            ? api.reqPlaylistResourceClipAddLast(playlist.id_text, target.idText)
            : api.reqPlaylistResourceItemAddLast(playlist.id_text, target.idText)
        );
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

  const styles = useMemo(
    () =>
      StyleSheet.create({
        backdrop: {
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          flex: 1,
          justifyContent: 'flex-end',
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
    <Modal animationType="slide" onRequestClose={closeSheet} transparent visible={target !== null}>
      <Pressable
        accessibilityLabel={t('misc.close')}
        onPress={closeSheet}
        style={styles.backdrop}
        testID="add-to-playlist-backdrop"
      >
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
            <ScrollView style={styles.optionsScroll}>
              {playlists.map((playlist) => (
                <Pressable
                  accessibilityRole="button"
                  disabled={isSaving}
                  key={playlist.id_text}
                  onPress={() => {
                    void addToPlaylist(playlist);
                  }}
                  style={styles.optionRow}
                  testID={`add-to-playlist-option-${playlist.id_text}`}
                >
                  <Text style={styles.optionText}>{playlist.title ?? playlist.id_text}</Text>
                </Pressable>
              ))}
            </ScrollView>
          ) : null}
          {noticeKey !== null ? (
            <Text style={styles.notice} testID="add-to-playlist-notice">
              {t(noticeKey)}
            </Text>
          ) : null}
          <View style={styles.sheetActions}>
            <Button
              label={t('misc.close')}
              onPress={closeSheet}
              testID="add-to-playlist-close"
              variant="secondary"
            />
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );

  return { addToPlaylistSheet, requestAddToPlaylist };
}
