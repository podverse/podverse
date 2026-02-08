'use client';

import { useTranslations } from 'next-intl';
import type { QueryParamsQueueMedium } from '@podverse/helpers';
import {
  getQueryParamFromQueueMediumId,
  getQueueMediumIdForChannelMediumId,
  MediumEnum,
} from '@podverse/helpers';
import React from 'react';
import { Modal } from './Modal';
import { MEDIUM } from '../../constants/medium';
import type { ModalPlaylistAddToState } from '../../contexts/Modals';
import { useModals } from '../../contexts/Modals';
import { MediaHeaderMini } from '../MediaHeaderMini/MediaHeaderMini';
import { ButtonTabs } from '../Tabs/ButtonTabs';
import { apiRequestService } from '../../factories/apiRequestService';
import type { DTOPlaylist } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import { ListPlaylists } from '../List/Playlists/ListPlaylists';
import { useAccount } from '../../contexts/Account';
import { useSkipInitialEffect } from '../../hooks/useSkipInitialEffect';
import { showToastPromise } from '../Toast/Toast';
import { CallToActionMessage } from '../CallToActionMessage/CallToActionMessage';

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
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tInstructions = useTranslations('instructions');
  const tAuthentication = useTranslations('authentication');
  const header = tFeatures('playlist.add_to_playlist');
  const { modalPlaylistAddTo, setModalPlaylistAddTo, setModalAuthLogin } = useModals();
  const [playlists, setPlaylists] = React.useState<DTOPlaylist[]>([]);
  const [totalPages, setTotalPages] = React.useState(0);
  const { loggedInAccount } = useAccount();

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
    if (addByRSSResourceData) {
      showToastPromise(
        apiRequestService.reqPlaylistResourceItemAddByRSSAddFirst(playlist.id_text, {
          add_by_rss_resource_data: addByRSSResourceData,
        }),
        {
          success: tFeatures('playlist.added_to_playlist'),
          error: tFeatures('playlist.add_error'),
        }
      );
    } else if (clip) {
      showToastPromise(
        apiRequestService.reqPlaylistResourceClipAddFirst(playlist.id_text, clip.id_text),
        {
          success: tFeatures('playlist.added_to_playlist'),
          error: tFeatures('playlist.add_error'),
        }
      );
    } else if (item_soundbite) {
      showToastPromise(
        apiRequestService.reqPlaylistResourceItemSoundbiteAddFirst(
          playlist.id_text,
          item_soundbite.id_text
        ),
        {
          success: tFeatures('playlist.added_to_playlist'),
          error: tFeatures('playlist.add_error'),
        }
      );
    } else if (item) {
      showToastPromise(
        apiRequestService.reqPlaylistResourceItemAddFirst(playlist.id_text, item.id_text),
        {
          success: tFeatures('playlist.added_to_playlist'),
          error: tFeatures('playlist.add_error'),
        }
      );
    }

    clearModalPlaylistAddTo();
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
      header={header}
      ariaLabel={header}
      modalContentMaxWidth={500}
    >
      {!loggedInAccount && (
        <CallToActionMessage
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
        <>
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
          <ListPlaylists
            page={filterParams.page}
            setPage={(page: number) => setFilterParams({ ...filterParams, page })}
            playlists={playlists}
            totalPages={totalPages}
            showLoginMessage={false}
            onClick={onClick}
          />
        </>
      )}
    </Modal>
  );
};
