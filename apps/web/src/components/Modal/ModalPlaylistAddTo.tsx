'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';

import type { QueryParamsQueueMedium } from '@podverse/helpers';
import type { DTOPlaylist } from '@podverse/helpers';
import {
  getQueryParamFromQueueMediumId,
  getQueueMediumIdForChannelMediumId,
  MediumEnum,
} from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import { ButtonTabs, CallToActionMessage, FormStack, Modal } from '@podverse/ui';

import { MEDIUM } from '../../constants/medium';
import { ROUTES } from '../../constants/routes';
import { useAccount } from '../../contexts/Account';
import type { ModalPlaylistAddToState } from '../../contexts/Modals';
import { useModals } from '../../contexts/Modals';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useMembershipGate } from '../../hooks/useMembershipGate';
import { useSkipInitialEffect } from '../../hooks/useSkipInitialEffect';
import { ListPlaylists } from '../List/Playlists/ListPlaylists';
import { MediaHeaderMini } from '../MediaHeaderMini/MediaHeaderMini';
import { showToast } from '../Toast/Toast';

import styles from '../../styles/components/Modal/ModalPlaylistAddTo.module.scss';

type FilterParams = {
  medium: QueryParamsQueueMedium | null;
  page: number;
};

const getCurrentMediumId = (
  filterParams: FilterParams,
  modalPlaylistAddTo: ModalPlaylistAddToState
) => {
  const mediumFromChannel = modalPlaylistAddTo?.channel?.medium_id ?? null;
  const mediumFromAddByRSS = modalPlaylistAddTo?.addByRSSResourceData?.medium_id ?? null;
  return (
    filterParams.medium ||
    getQueryParamFromQueueMediumId(mediumFromChannel ?? mediumFromAddByRSS) ||
    getQueryParamFromQueueMediumId(MediumEnum.AV)
  );
};

export const ModalPlaylistAddTo: React.FC = () => {
  const apiRequestService = getApiRequestService();
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const tMisc = useTranslations('misc');
  const header = tFeatures('playlist.add_to_playlist');
  const { modalPlaylistAddTo, setModalPlaylistAddTo, setModalAuthLogin } = useModals();
  const router = useRouter();
  const [playlists, setPlaylists] = React.useState<DTOPlaylist[]>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const { loggedInAccount } = useAccount();
  const { tryHandleMembershipGateError } = useMembershipGate();

  const [filterParams, setFilterParams] = React.useState<FilterParams>({
    medium: null,
    page: 1,
  });

  const fetchPlaylists = async (page: number, medium: QueryParamsQueueMedium) => {
    const response = await apiRequestService.reqPlaylistGetMany({
      page,
      type: 'private',
      sort: 'a_z',
      medium,
      range: null,
    });
    return {
      playlists: response.data,
      totalPages: getTotalPages(
        response.meta?.count,
        response.meta?.limit,
        response.data.length,
        page
      ),
    };
  };

  useSkipInitialEffect(() => {
    const handleFetch = async () => {
      const { playlists, totalPages } = await fetchPlaylists(
        1,
        getCurrentMediumId(filterParams, modalPlaylistAddTo)
      );
      setPlaylists(playlists);
      setTotalPages(totalPages);
    };

    if (
      loggedInAccount &&
      (modalPlaylistAddTo.channel || modalPlaylistAddTo.addByRSSResourceData)
    ) {
      handleFetch();
    }
  }, [modalPlaylistAddTo.channel, modalPlaylistAddTo.addByRSSResourceData]);

  useSkipInitialEffect(() => {
    const handleFetch = async () => {
      const { playlists, totalPages } = await fetchPlaylists(
        filterParams.page,
        getCurrentMediumId(filterParams, modalPlaylistAddTo)
      );
      setPlaylists(playlists);
      setTotalPages(totalPages);
    };

    if (
      loggedInAccount &&
      (modalPlaylistAddTo.channel || modalPlaylistAddTo.addByRSSResourceData)
    ) {
      handleFetch();
    }
  }, [filterParams]);

  const clearModalPlaylistAddTo = () => {
    setModalPlaylistAddTo({
      channel: null,
      item: null,
      clip: null,
      item_soundbite: null,
      addByRSSResourceData: null,
      addByRSSHashId: null,
    });
    setFilterParams({ medium: null, page: 1 });
  };

  const mediumIdForTabs =
    modalPlaylistAddTo?.channel?.medium_id ??
    modalPlaylistAddTo?.addByRSSResourceData?.medium_id ??
    null;
  const buttonTabs = MEDIUM.buttonTabs(
    getQueueMediumIdForChannelMediumId(mediumIdForTabs ?? undefined) ?? MediumEnum.AV,
    tMedia,
    (mediumId: number) =>
      setFilterParams({ medium: getQueryParamFromQueueMediumId(mediumId), page: 1 })
  );

  const onClick = async (playlist: DTOPlaylist) => {
    const { item, clip, item_soundbite, addByRSSResourceData } = modalPlaylistAddTo;
    const request = addByRSSResourceData
      ? apiRequestService.reqPlaylistResourceItemAddByRSSAddFirst(playlist.id_text, {
          add_by_rss_resource_data: addByRSSResourceData,
        })
      : clip
        ? apiRequestService.reqPlaylistResourceClipAddFirst(playlist.id_text, clip.id_text)
        : item_soundbite
          ? apiRequestService.reqPlaylistResourceItemSoundbiteAddFirst(
              playlist.id_text,
              item_soundbite.id_text
            )
          : item
            ? apiRequestService.reqPlaylistResourceItemAddFirst(playlist.id_text, item.id_text)
            : null;

    // Close the modal immediately (unchanged UX), then resolve the add. A membership 403 shows the
    // gate modal via `tryHandleMembershipGateError` instead of the generic error toast (no double-show).
    clearModalPlaylistAddTo();

    if (request === null) {
      return;
    }

    try {
      await request;
      showToast(tFeatures('playlist.added_to_playlist'), 'success');
    } catch (error) {
      if (!tryHandleMembershipGateError(error)) {
        showToast(tFeatures('playlist.add_error'), 'error');
      }
    }
  };

  const hasNoPlaylists = loggedInAccount && playlists.length === 0;

  const onCreatePlaylist = () => {
    clearModalPlaylistAddTo();
    router.push(`${ROUTES.PLAYLIST}/create`);
  };

  const isOpen =
    !!modalPlaylistAddTo.addByRSSResourceData ||
    !!(
      modalPlaylistAddTo.channel &&
      (modalPlaylistAddTo.item || modalPlaylistAddTo.clip || modalPlaylistAddTo.item_soundbite)
    );

  if (!modalPlaylistAddTo.channel && !modalPlaylistAddTo.addByRSSResourceData) {
    return null;
  }

  const addByRSSTitle = modalPlaylistAddTo.addByRSSResourceData?.title ?? null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={clearModalPlaylistAddTo}
      closeButtonAriaLabel={tMisc('close_modal')}
      header={header}
      ariaLabel={header}
    >
      {!loggedInAccount && (
        <CallToActionMessage
          layout="modal"
          message={tInstructions('login_to_create_playlists')}
          buttonLabel={tAuthentication('login')}
          onButtonClick={() => {
            setModalPlaylistAddTo({
              channel: null,
              item: null,
              clip: null,
              item_soundbite: null,
              addByRSSResourceData: null,
              addByRSSHashId: null,
            });
            setModalAuthLogin({ isOpen: true });
          }}
        />
      )}
      {loggedInAccount && (
        <FormStack>
          {modalPlaylistAddTo.addByRSSResourceData ? (
            addByRSSTitle ? (
              <div className={styles.addByRSSTitle}>{addByRSSTitle}</div>
            ) : null
          ) : modalPlaylistAddTo.channel ? (
            <MediaHeaderMini
              channel={modalPlaylistAddTo.channel}
              item={modalPlaylistAddTo.item}
              item_soundbite={modalPlaylistAddTo.item_soundbite}
            />
          ) : null}
          <ButtonTabs
            buttonTabs={buttonTabs}
            selectedKey={getCurrentMediumId(filterParams, modalPlaylistAddTo)}
          />
          {hasNoPlaylists ? (
            <CallToActionMessage
              layout="modal"
              message={tInstructions('no_playlists_created')}
              buttonLabel={tFeatures('playlist.create_playlist')}
              onButtonClick={onCreatePlaylist}
            />
          ) : (
            <ListPlaylists
              page={filterParams.page}
              setPage={(page: number) => setFilterParams({ ...filterParams, page })}
              playlists={playlists}
              totalPages={totalPages}
              showLoginMessage={false}
              onClick={onClick}
            />
          )}
        </FormStack>
      )}
    </Modal>
  );
};
