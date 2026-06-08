'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useModals } from '../../contexts/Modals';
import { isTermsAcceptanceRequired } from '../../lib/termsAcceptanceRequired';
import { shouldShowServerEnvironmentDisclaimer } from '../Modal/serverEnvironmentDisclaimer';

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

const LazyModalEmbedBuilder = dynamic(
  () => import('../Modal/ModalEmbedBuilder').then((m) => ({ default: m.ModalEmbedBuilder })),
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

const LazyModalBoostMessageError = dynamic(
  () =>
    import('../Modal/ModalBoostMessageError').then((m) => ({
      default: m.ModalBoostMessageError,
    })),
  { ssr: false }
);

const LazyModalBoostMintRateLimit = dynamic(
  () =>
    import('../Modal/ModalBoostMintRateLimit').then((m) => ({
      default: m.ModalBoostMintRateLimit,
    })),
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

const LazyModalTermsAcceptance = dynamic(
  () => import('../Modal/ModalTermsAcceptance').then((m) => ({ default: m.ModalTermsAcceptance })),
  { ssr: false }
);

export const Modals: React.FC = () => {
  const {
    modalAuthLogin,
    modalPlaylistAddTo,
    modalClip,
    modalClipCreated,
    modalShare,
    modalEmbedBuilder,
    modalFunding,
    modalSourceSelector,
    modalBoost,
    modalBoostMessageError,
    modalBoostMintRateLimit,
    modalLoginRequired,
  } = useModals();
  const config = useConfig();
  const { loggedInAccount } = useAccount();
  const { serverEnvironmentDisclaimerAccepted } = useLocalSettings();
  const showDisclaimer =
    shouldShowServerEnvironmentDisclaimer(config.public.server_env) &&
    !serverEnvironmentDisclaimerAccepted;
  const showTermsAcceptance =
    !showDisclaimer &&
    isTermsAcceptanceRequired(loggedInAccount, config.public.legal.terms.version);

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
      {(modalEmbedBuilder.channel !== null ||
        modalEmbedBuilder.item !== null ||
        modalEmbedBuilder.clip !== null ||
        modalEmbedBuilder.item_chapter !== null ||
        modalEmbedBuilder.item_soundbite !== null ||
        modalEmbedBuilder.playlist !== null) && <LazyModalEmbedBuilder />}
      {(modalFunding.channel_fundings.length > 0 || modalFunding.item_fundings.length > 0) && (
        <LazyModalFunding />
      )}
      {(modalBoost.channel !== null || modalBoost.item !== null) && <LazyModalBoost />}
      {modalBoostMessageError.message && <LazyModalBoostMessageError />}
      {modalBoostMintRateLimit.message && <LazyModalBoostMintRateLimit />}
      {(modalSourceSelector.labeledItemEnclosures?.length ?? 0) > 0 && <LazyModalSourceSelector />}
      {(modalLoginRequired.title !== null || modalLoginRequired.message !== null) && (
        <LazyModalLoginRequired />
      )}
      {showDisclaimer && <LazyModalDisclaimer isOpen={showDisclaimer} />}
      {showTermsAcceptance && <LazyModalTermsAcceptance isOpen={showTermsAcceptance} />}
    </>
  );
};
