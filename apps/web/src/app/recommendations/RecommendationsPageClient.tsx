'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useCallback, useEffect, useState } from 'react';

import type {
  DTOAccountRecommendation,
  DTOPersonRecommendation,
  RecommendationChip,
} from '@podverse/helpers';
import {
  buildAlbumPath,
  buildArtistPath,
  buildDTOChannelImageLoadCandidates,
  buildPersonPath,
  buildPodcastPath,
  isTasteProfileTrackingAllowed,
  recommendationsListViewModeScope,
} from '@podverse/helpers';
import {
  Button,
  CallToActionMessage,
  MainColumnStack,
  MainHeader,
  MainSidebarLayout,
} from '@podverse/ui';

import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { MainWrapper } from '../../components/Main/MainWrapper';
import { MediaListChips } from '../../components/MediaListChips/MediaListChips';
import { NoResults } from '../../components/NoResults/NoResults';
import { RecommendationChannelNodes } from '../../components/Recommendations/RecommendationChannelNodes';
import type { ViewSelectedOption } from '../../components/ViewSelector/ViewSelector';
import { ViewSelector } from '../../components/ViewSelector/ViewSelector';
import { IMAGES } from '../../constants/images';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { useModals } from '../../contexts/Modals';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useListViewMode } from '../../hooks/useListViewMode';

import styles from './RecommendationsPage.module.scss';

type LoadState =
  | { status: 'idle' }
  | { status: 'loading'; chip: RecommendationChip }
  | { status: 'error'; chip: RecommendationChip }
  | { status: 'ready'; chip: RecommendationChip; items: DTOAccountRecommendation[] };

type RecommendationsPageClientProps = {
  chip: RecommendationChip;
  urlChip: RecommendationChip | null;
  chips: readonly RecommendationChip[];
};

function showPath(chip: 'podcasts' | 'albums' | 'artists', idText: string): string {
  if (chip === 'albums') {
    return buildAlbumPath(idText);
  }
  if (chip === 'artists') {
    return buildArtistPath(idText);
  }
  return buildPodcastPath(idText);
}

function listImageCandidates(item: DTOAccountRecommendation): string[] {
  return buildDTOChannelImageLoadCandidates(
    item.channel.channel_images,
    IMAGES.LIST.PODCASTS.SIZE_FIND_TARGET,
    'lesser'
  );
}

function RecommendationNodes({
  chip,
  items,
  onHide,
  untitled,
  viewSelected,
}: {
  chip: 'podcasts' | 'albums' | 'artists';
  items: DTOAccountRecommendation[];
  onHide: (channelIdText: string) => void;
  untitled: string;
  viewSelected: ViewSelectedOption;
}) {
  return (
    <RecommendationChannelNodes
      items={items.map((item) => ({
        href: showPath(chip, item.channel.id_text),
        id: item.channel.id_text,
        imageCandidates: listImageCandidates(item),
        title: item.channel.title?.trim() || untitled,
      }))}
      onHide={onHide}
      viewSelected={viewSelected}
    />
  );
}

export function RecommendationsPageClient({
  chip,
  urlChip,
  chips,
}: RecommendationsPageClientProps) {
  const t = useTranslations('features.recommendations');
  const tAuth = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const router = useRouter();
  const { loggedInAccount } = useAccount();
  const config = useConfig();
  const { setModalAuthLogin } = useModals();
  const { setViewSelected, viewSelected } = useListViewMode(
    chip === 'people'
      ? { kind: 'list', name: 'recommendations-people' }
      : recommendationsListViewModeScope(chip)
  );
  const [state, setState] = useState<LoadState>({ status: 'idle' });
  const [people, setPeople] = useState<DTOPersonRecommendation[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const signedIn = loggedInAccount !== null && loggedInAccount !== undefined;
  const trackingAllowed = isTasteProfileTrackingAllowed(
    loggedInAccount?.account_settings,
    config.public.legal.tasteProfileAgreement.version
  );

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        setRefreshKey((key) => key + 1);
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  useEffect(() => {
    if (!signedIn) {
      setState({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading', chip });
    const request =
      chip === 'people'
        ? getApiRequestService()
            .reqAccountPersonRecommendations()
            .then((nextPeople) => {
              if (!cancelled) {
                setPeople(nextPeople);
                setState({ status: 'ready', chip, items: [] });
              }
            })
        : getApiRequestService()
            .reqAccountRecommendations({ chip })
            .then((items) => {
              if (!cancelled) {
                setPeople([]);
                setState({ status: 'ready', chip, items });
              }
            });
    request.catch(() => {
      if (!cancelled) {
        setPeople([]);
        setState({ status: 'error', chip });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [chip, loggedInAccount?.id_text, refreshKey, signedIn]);

  const hideChannelFromLists = useCallback((channelIdText: string) => {
    setState((current) => {
      if (current.status !== 'ready') {
        return current;
      }
      return {
        ...current,
        items: current.items.filter((item) => item.channel.id_text !== channelIdText),
      };
    });
    void getApiRequestService()
      .reqAccountChannelHiddenHide({ channel_id_text: channelIdText })
      .catch((error) => {
        console.error('[RecommendationsPageClient] hide failed', error);
        setRefreshKey((key) => key + 1);
      });
  }, []);

  const shown: LoadState =
    signedIn && (state.status === 'idle' || state.chip !== chip)
      ? { status: 'loading', chip }
      : state;
  const items = shown.status === 'ready' ? shown.items : [];
  const visibleCount = chip === 'people' ? people.length : items.length;
  const openSettings = () => {
    router.push(`${ROUTES.SETTINGS}?tab=recommendations`);
  };

  return (
    <>
      <MainHeader title={t('title')} />
      <MainWrapper>
        <MainSidebarLayout>
          <MainColumnStack>
            <MediaListChips
              actions={
                signedIn ? (
                  <Button onClick={openSettings} type="button" variant="mini">
                    {tMisc('edit')}
                  </Button>
                ) : undefined
              }
              actionsTestId="recommendations-list-actions"
              chips={chips}
              page="recommendations"
              selected={chip}
              trailing={
                <ViewSelector setViewSelected={setViewSelected} viewSelected={viewSelected} />
              }
              urlChip={urlChip}
            />
            {!signedIn ? (
              <CallToActionMessage
                buttonLabel={tAuth('login')}
                message={tAuth('login_required')}
                onButtonClick={() => {
                  setModalAuthLogin({ isOpen: true });
                }}
              />
            ) : null}
            {signedIn && !trackingAllowed && shown.status === 'ready' && visibleCount === 0 ? (
              <CallToActionMessage
                buttonLabel={t('enable')}
                message={t('need_taste_profile')}
                onButtonClick={openSettings}
              />
            ) : null}
            {signedIn && !trackingAllowed && visibleCount > 0 ? (
              <div className={styles.note}>
                <p>{t('paused')}</p>
                <Button type="button" variant="secondary" onClick={openSettings}>
                  {t('enable')}
                </Button>
              </div>
            ) : null}
            {signedIn && trackingAllowed && shown.status === 'ready' && visibleCount === 0 ? (
              <NoResults message={t('check_back')} role="status" />
            ) : null}
            {signedIn && shown.status === 'error' ? (
              <p className={styles.status} role="alert">
                {t('load_error')}
              </p>
            ) : null}
            <WebLoadingSpinnerOverlay isLoading={signedIn && shown.status === 'loading'} />
            {chip !== 'people' && items.length > 0 ? (
              <RecommendationNodes
                chip={chip}
                items={items}
                onHide={hideChannelFromLists}
                untitled={tMisc('untitled')}
                viewSelected={viewSelected}
              />
            ) : null}
            {chip === 'people' && people.length > 0 ? (
              <RecommendationChannelNodes
                items={people.map((item) => ({
                  href: buildPersonPath(item.person.id_text),
                  id: item.person.id_text,
                  imageCandidates:
                    item.person.list_image_url !== null && item.person.list_image_url !== ''
                      ? [item.person.list_image_url]
                      : [],
                  title: item.person.display_name,
                }))}
                viewSelected={viewSelected}
              />
            ) : null}
          </MainColumnStack>
        </MainSidebarLayout>
      </MainWrapper>
    </>
  );
}
