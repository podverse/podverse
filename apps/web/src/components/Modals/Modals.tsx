'use client';

import React from 'react';
import dynamic from 'next/dynamic';
import { useModals } from '../../contexts/Modals';
import { useLocalSettings } from '../../contexts/LocalSettings';

const LazyModalAuthLogin = dynamic(
  () => import('../Modal/ModalAuthLogin').then((m) => ({ default: m.ModalAuthLogin })),
  { ssr: false }
);

const LazyModalPlaylistAddTo = dynamic(
  () => import('../Modal/ModalPlaylistAddTo').then((m) => ({ default: m.ModalPlaylistAddTo })),
  { ssr: false }
);

const LazyModalClip = dynamic(
  () => import('../Modal/ModalClip').then((m) => ({ default: m.ModalClip })),
  { ssr: false }
);

const LazyModalClipCreated = dynamic(
  () => import('../Modal/ModalClipCreated').then((m) => ({ default: m.ModalClipCreated })),
  { ssr: false }
);

const LazyModalShare = dynamic(
  () => import('../Modal/ModalShare').then((m) => ({ default: m.ModalShare })),
  { ssr: false }
);

const LazyModalFunding = dynamic(
  () => import('../Modal/ModalFunding').then((m) => ({ default: m.ModalFunding })),
  { ssr: false }
);

const LazyModalBoost = dynamic(
  () => import('../Modal/ModalBoost').then((m) => ({ default: m.ModalBoost })),
  { ssr: false }
);

const LazyModalSourceSelector = dynamic(
  () => import('../Modal/ModalSourceSelector').then((m) => ({ default: m.ModalSourceSelector })),
  { ssr: false }
);

const LazyModalLoginRequired = dynamic(
  () => import('../Modal/ModalLoginRequired').then((m) => ({ default: m.ModalLoginRequired })),
  { ssr: false }
);

const LazyModalDisclaimer = dynamic(
  () => import('../Modal/ModalDisclaimer').then((m) => ({ default: m.ModalDisclaimer })),
  { ssr: false }
);

export const Modals: React.FC = () => {
  const {
    modalAuthLogin,
    modalPlaylistAddTo,
    modalClip,
    modalClipCreated,
    modalShare,
    modalFunding,
    modalSourceSelector,
    modalBoost,
    modalLoginRequired,
  } = useModals();
  const { serverEnvironmentDisclaimerAccepted } = useLocalSettings();
  const showDisclaimer = !serverEnvironmentDisclaimerAccepted;

  return (
    <>
      {modalAuthLogin.isOpen && <LazyModalAuthLogin />}
      {(modalPlaylistAddTo.channel !== null ||
        modalPlaylistAddTo.addByRSSResourceData !== null) && <LazyModalPlaylistAddTo />}
      {(modalClip.channel !== null || modalClip.item !== null) && <LazyModalClip />}
      {modalClipCreated.clip !== null && <LazyModalClipCreated />}
      {(modalShare.channel !== null ||
        modalShare.item !== null ||
        modalShare.clip !== null ||
        modalShare.item_chapter !== null ||
        modalShare.item_soundbite !== null) && <LazyModalShare />}
      {(modalFunding.channel_fundings.length > 0 || modalFunding.item_fundings.length > 0) && (
        <LazyModalFunding />
      )}
      {(modalBoost.channel !== null || modalBoost.item !== null) && <LazyModalBoost />}
      {(modalSourceSelector.labeledItemEnclosures?.length ?? 0) > 0 && <LazyModalSourceSelector />}
      {(modalLoginRequired.title !== null || modalLoginRequired.message !== null) && (
        <LazyModalLoginRequired />
      )}
      {showDisclaimer && <LazyModalDisclaimer isOpen={showDisclaimer} />}
    </>
  );
};
