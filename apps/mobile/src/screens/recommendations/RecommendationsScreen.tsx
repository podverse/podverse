import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, View } from 'react-native';

import type { DTOAccountRecommendation, RecommendationChip } from '@podverse/helpers';
import { isTasteProfileTrackingAllowed, primaryChannelListArtworkUrl } from '@podverse/helpers';

import { useAuthPrompt } from '../../auth/AuthPromptContext';
import { useAuth } from '../../auth/AuthProvider';
import type { AuthRequestDeps } from '../../auth/authRequestWithRefresh';
import { requestWithMobileAuthRefresh } from '../../auth/authRequestWithRefresh';
import { ChipRowWithActions } from '../../components/form';
import type { MediaRowMoreAction } from '../../components/player/MediaRowActions';
import { Button, FillList } from '../../components/primitives';
import { CallToActionSection } from '../../components/state/CallToActionSection';
import { ListEmpty } from '../../components/state/ListEmpty';
import { LoadingSection } from '../../components/state/LoadingSection';
import { RetryableError } from '../../components/state/RetryableError';
import type { BrowseStackParamList } from '../../navigation';
import {
  BROWSE_STACK_ROUTES,
  buildAlbumDetailParams,
  buildArtistDetailParams,
  buildPodcastDetailParams,
  getEnclosingTabNavigation,
  MORE_STACK_ROUTES,
} from '../../navigation';
import type { HomeViewMode } from '../../prefs/homeListPrefs';
import { DEFAULT_HOME_VIEW_MODE } from '../../prefs/homeListPrefs';
import { getTasteProfileAgreementCurrentVersion } from '../../tasteProfileConsent/tasteProfileConsentGate';
import { screenBodyInsets } from '../../theme/screenLayout';
import { typography } from '../../theme/typography';
import { useFeedListColumns } from '../../theme/useFeedListColumns';
import { useTheme } from '../../theme/useTheme';
import type { HomeFeedRowData } from '../home/homeFeedData';
import type { HomeFeedGridCellRemoveAction } from '../home/HomeFeedGridCell';
import { HomeFeedGridCell } from '../home/HomeFeedGridCell';
import { HomeFeedRow } from '../home/HomeFeedRow';
import { MediaTypeSelector } from '../home/MediaTypeSelector';
import {
  readRecommendationChip,
  readRecommendationViewMode,
  writeRecommendationChip,
  writeRecommendationViewMode,
} from './recommendationsListPrefs';
import { RecommendationsOverflowMenu } from './RecommendationsOverflowMenu';

const CHIPS = ['podcasts', 'albums', 'artists'] as const satisfies readonly RecommendationChip[];

const CHIP_LABEL_KEYS: Record<RecommendationChip, string> = {
  albums: 'media.music.albums',
  artists: 'media.music.artists',
  podcasts: 'media.podcast.podcasts',
};

type LoadState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: DTOAccountRecommendation[] };

function openShow(
  navigation: NativeStackNavigationProp<BrowseStackParamList, 'BrowseRoot'>,
  chip: RecommendationChip,
  item: DTOAccountRecommendation
) {
  const idText = item.channel.id_text;
  const previewTitle = item.channel.title;
  const previewImageUrl = primaryChannelListArtworkUrl(item.channel.channel_images);
  if (chip === 'albums') {
    navigation.navigate(
      BROWSE_STACK_ROUTES.AlbumDetail,
      buildAlbumDetailParams({ albumId: idText, previewImageUrl, previewTitle })
    );
    return;
  }
  if (chip === 'artists') {
    navigation.navigate(
      BROWSE_STACK_ROUTES.ArtistDetail,
      buildArtistDetailParams({ artistId: idText, previewImageUrl, previewTitle })
    );
    return;
  }
  navigation.navigate(
    BROWSE_STACK_ROUTES.PodcastDetail,
    buildPodcastDetailParams({ podcastId: idText, previewImageUrl, previewTitle })
  );
}

function recommendationRow(item: DTOAccountRecommendation, untitled: string): HomeFeedRowData {
  const title = item.channel.title?.trim() || untitled;
  return {
    id: item.channel.id_text,
    imageUrl: primaryChannelListArtworkUrl(item.channel.channel_images),
    subtitle: null,
    title,
  };
}

export function RecommendationsScreen() {
  const { t } = useTranslation();
  const { styles: themeStyles, tokens } = useTheme();
  const navigation = useNavigation<NativeStackNavigationProp<BrowseStackParamList, 'BrowseRoot'>>();
  const { onRequestLogin } = useAuthPrompt();
  const auth = useAuth();
  const [chip, setChip] = useState<RecommendationChip>('podcasts');
  const chipRef = useRef<RecommendationChip>('podcasts');
  const [chipReady, setChipReady] = useState(false);
  const [viewMode, setViewMode] = useState<HomeViewMode>(DEFAULT_HOME_VIEW_MODE);
  const [retryCount, setRetryCount] = useState(0);
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const signedIn = auth.status === 'authenticated' && auth.account !== null;
  const trackingAllowed = isTasteProfileTrackingAllowed(
    auth.account?.account_settings,
    getTasteProfileAgreementCurrentVersion()
  );

  const openSettings = useCallback(() => {
    getEnclosingTabNavigation(navigation)?.navigate('More', {
      screen: MORE_STACK_ROUTES.MoreSettingsTasteProfile,
    });
  }, [navigation]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      void readRecommendationChip().then(async (stored) => {
        const mode = await readRecommendationViewMode(stored);
        if (cancelled) {
          return;
        }
        chipRef.current = stored;
        setChip(stored);
        setViewMode(mode);
        setChipReady(true);
      });
      return () => {
        cancelled = true;
      };
    }, [])
  );

  useFocusEffect(
    useCallback(() => {
      if (!signedIn || !chipReady) {
        setState({ status: 'idle' });
        return;
      }
      let cancelled = false;
      setState({ status: 'loading' });
      const deps: AuthRequestDeps = {
        accessToken: auth.accessToken,
        clearSession: auth.clearSession,
        refreshToken: auth.refreshToken,
        setTokens: auth.setTokens,
      };
      void requestWithMobileAuthRefresh(deps, (api) => api.reqAccountRecommendations({ chip }))
        .then((items) => {
          if (!cancelled) {
            setState({ status: 'ready', items });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setState({ status: 'error' });
          }
        });
      return () => {
        cancelled = true;
      };
    }, [
      auth.accessToken,
      auth.clearSession,
      auth.refreshToken,
      auth.setTokens,
      chip,
      chipReady,
      retryCount,
      signedIn,
    ])
  );

  const hideChannelFromLists = useCallback(
    (channelIdText: string) => {
      setState((current) => {
        if (current.status !== 'ready') {
          return current;
        }
        return {
          ...current,
          items: current.items.filter((item) => item.channel.id_text !== channelIdText),
        };
      });
      const deps: AuthRequestDeps = {
        accessToken: auth.accessToken,
        clearSession: auth.clearSession,
        refreshToken: auth.refreshToken,
        setTokens: auth.setTokens,
      };
      void requestWithMobileAuthRefresh(deps, (api) =>
        api.reqAccountChannelHiddenHide({ channel_id_text: channelIdText })
      ).catch((error) => {
        console.warn('[RecommendationsScreen] hide failed', error);
        setRetryCount((count) => count + 1);
      });
    },
    [auth.accessToken, auth.clearSession, auth.refreshToken, auth.setTokens]
  );

  const items = state.status === 'ready' ? state.items : [];
  const isGridView = viewMode === 'grid' && items.length > 0;
  const { cellWidth, columns, onListLayout } = useFeedListColumns({
    gap: tokens.spacing.md,
    horizontalInset: tokens.spacing.lg,
    isGridView,
  });

  const styles = useMemo(() => {
    const bodyInsets = screenBodyInsets(tokens.spacing);

    return StyleSheet.create({
      columnCell: {
        width: cellWidth,
      },
      columnWrapper: {
        gap: tokens.spacing.md,
      },
      content: {
        flexGrow: 1,
        paddingBottom: tokens.spacing.lg,
        paddingHorizontal: bodyInsets.paddingHorizontal,
      },
      note: {
        gap: tokens.spacing.md,
        paddingBottom: tokens.spacing.lg,
      },
      noteText: {
        ...typography.body,
        color: themeStyles.textSecondary.color,
      },
      screen: {
        backgroundColor: themeStyles.screen.backgroundColor,
        flex: 1,
      },
      selectorSection: {
        ...bodyInsets,
      },
    });
  }, [cellWidth, themeStyles, tokens]);

  const [chipsContentWidth, setChipsContentWidth] = useState(0);
  const handleChipsContentWidth = useCallback((width: number) => {
    setChipsContentWidth((current) => (current === width ? current : width));
  }, []);

  const selectChip = useCallback((next: RecommendationChip) => {
    chipRef.current = next;
    setChip(next);
    void writeRecommendationChip(next);
    void readRecommendationViewMode(next).then((mode) => {
      if (chipRef.current === next) {
        setViewMode(mode);
      }
    });
  }, []);

  const handleViewModeChange = useCallback((nextViewMode: HomeViewMode) => {
    setViewMode(nextViewMode);
    void writeRecommendationViewMode(chipRef.current, nextViewMode);
  }, []);

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <RecommendationsOverflowMenu onViewModeChange={handleViewModeChange} viewMode={viewMode} />
      ),
    });
  }, [handleViewModeChange, navigation, viewMode]);

  const rows = useMemo(
    () => items.map((item) => recommendationRow(item, t('misc.untitled'))),
    [items, t]
  );

  const openRow = useCallback(
    (row: HomeFeedRowData) => {
      const item = items.find((candidate) => candidate.channel.id_text === row.id);
      if (item === undefined) {
        return;
      }
      openShow(navigation, chip, item);
    },
    [chip, items, navigation]
  );

  const hideLabel = t('features.recommendations.hide');

  const gridRemoveAction = useMemo<HomeFeedGridCellRemoveAction>(
    () => ({
      label: hideLabel,
      onRemove: (row) => {
        hideChannelFromLists(row.id);
      },
    }),
    [hideLabel, hideChannelFromLists]
  );

  const renderItem = useCallback(
    ({ item }: { item: HomeFeedRowData }) => {
      if (isGridView) {
        return (
          <View style={styles.columnCell}>
            <HomeFeedGridCell
              artworkEdge={cellWidth}
              onPress={openRow}
              removeAction={gridRemoveAction}
              row={item}
              testID={`recommendations-row-${item.id}`}
            />
          </View>
        );
      }

      const extraMoreActions: MediaRowMoreAction[] = [
        {
          key: `hide-${item.id}`,
          label: hideLabel,
          onPress: () => {
            hideChannelFromLists(item.id);
          },
          testID: `recommendations-hide-${item.id}`,
          tone: 'danger',
        },
      ];

      return (
        <HomeFeedRow
          extraMoreActions={extraMoreActions}
          mediaType={chip}
          onPlayPress={openRow}
          onPress={openRow}
          row={item}
          testID={`recommendations-row-${item.id}`}
        />
      );
    },
    [
      cellWidth,
      chip,
      gridRemoveAction,
      hideLabel,
      hideChannelFromLists,
      isGridView,
      openRow,
      styles.columnCell,
    ]
  );

  const header =
    signedIn && !trackingAllowed && items.length > 0 ? (
      <View style={styles.note}>
        <Text style={styles.noteText}>{t('features.recommendations.paused')}</Text>
        <Button
          label={t('features.recommendations.enable')}
          onPress={openSettings}
          testID="recommendations-taste-profile-settings"
          variant="secondary"
        />
      </View>
    ) : null;

  const empty = !signedIn ? (
    <CallToActionSection
      actionLabelKey="authentication.login"
      messageKey="authentication.login_required"
      onAction={onRequestLogin}
      testID="recommendations-auth-required"
    />
  ) : state.status === 'loading' || state.status === 'idle' ? (
    <LoadingSection testID="recommendations-loading" />
  ) : state.status === 'error' ? (
    <RetryableError
      errorKey="features.recommendations.load_error"
      onRetry={() => {
        setRetryCount((count) => count + 1);
      }}
      testID="recommendations-error"
    />
  ) : !trackingAllowed ? (
    <CallToActionSection
      actionLabelKey="features.recommendations.enable"
      messageKey="features.recommendations.need_taste_profile"
      onAction={openSettings}
      testID="recommendations-need-taste-profile"
    />
  ) : (
    <ListEmpty messageKey="features.recommendations.check_back" testID="recommendations-empty" />
  );

  return (
    <View style={styles.screen} testID="recommendations-screen">
      <View style={styles.selectorSection}>
        {signedIn ? (
          <ChipRowWithActions
            actions={
              <Button
                label={t('features.recommendations.edit')}
                onPress={openSettings}
                testID="recommendations-edit"
                variant="secondary"
              />
            }
            actionsTestID="recommendations-edit-actions"
            chipsContentWidth={chipsContentWidth}
          >
            <MediaTypeSelector
              labelKeys={CHIP_LABEL_KEYS}
              onChange={selectChip}
              onContentWidthChange={handleChipsContentWidth}
              selectedMediaType={chip}
              testIDPrefix="recommendations"
              types={CHIPS}
            />
          </ChipRowWithActions>
        ) : (
          <MediaTypeSelector
            labelKeys={CHIP_LABEL_KEYS}
            onChange={selectChip}
            selectedMediaType={chip}
            testIDPrefix="recommendations"
            types={CHIPS}
          />
        )}
      </View>
      <FillList
        ListEmptyComponent={empty}
        ListHeaderComponent={header}
        columnWrapperStyle={columns > 1 ? styles.columnWrapper : undefined}
        contentContainerStyle={styles.content}
        data={rows}
        key={`cols-${columns}`}
        keyExtractor={(item) => item.id}
        numColumns={columns}
        onLayout={onListLayout}
        renderItem={renderItem}
      />
    </View>
  );
}
