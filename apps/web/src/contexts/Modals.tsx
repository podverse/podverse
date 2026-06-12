import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import type {
  DTOChannel,
  DTOChannelFunding,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemFunding,
  DTOItemSoundbite,
  DTOPlaylist,
  LabeledItemEnclosure,
} from '@podverse/helpers';
import type { AddByRSSResourceDataPayload } from '@podverse/parser-mapping';

import type { SourceSelectorActionType } from '../components/SourceSelectors/SourceSelectors';

type ModalBasic = {
  isOpen: boolean;
};

export type ModalMessage = {
  title: string | null;
  message: string | null;
  messageNode?: ReactNode | null;
  actionLabel?: string | null;
  actionHref?: string | null;
};

type ModalClip = {
  channel: DTOChannel | null;
  item: DTOItem | null;
};

type ModalClipCreated = {
  clip: DTOClip | null;
};

export type ModalShare = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  clip: DTOClip | null;
  item_chapter: DTOItemChapter | null;
  item_soundbite: DTOItemSoundbite | null;
  playlist: DTOPlaylist | null;
  playlist_item: string | null;
};

type ModalFunding = {
  channel_fundings: DTOChannelFunding[];
  item_fundings: DTOItemFunding[];
};

type ModalBoost = {
  channel: DTOChannel | null;
  item: DTOItem | null;
};

type ModalBoostMessageError = {
  title: string | null;
  message: string | null;
  /** `value.*` i18n key for primary button; default `boost_messages.pay_anyway`. */
  primaryActionI18nKey?: string | null;
  onSendAnyway?: (() => void) | null;
  onCancel?: (() => void) | null;
};

type ModalBoostMintRateLimit = {
  message: string | null;
};

export type ModalSourceSelector = {
  labeledItemEnclosures: LabeledItemEnclosure[];
  actionType: SourceSelectorActionType;
  itemTitle: string | null;
};

export type ModalPlaylistAddToState = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  clip: DTOClip | null;
  item_soundbite: DTOItemSoundbite | null;
  addByRSSResourceData?: AddByRSSResourceDataPayload | null;
  addByRSSHashId?: string | null;
};

type ModalsContextType = {
  modalAuthLogin: ModalBasic;
  setModalAuthLogin: (val: ModalBasic) => void;
  modalSignUp: ModalBasic;
  setModalSignUp: (val: ModalBasic) => void;
  modalPlaylistAddTo: ModalPlaylistAddToState;
  setModalPlaylistAddTo: (val: ModalPlaylistAddToState) => void;
  modalClip: ModalClip;
  setModalClip: (val: ModalClip) => void;
  modalClipCreated: ModalClipCreated;
  setModalClipCreated: (val: ModalClipCreated) => void;
  modalMediaPlayerIsOpen: boolean;
  setModalMediaPlayerIsOpen: (val: boolean) => void;
  modalShare: ModalShare;
  setModalShare: (val: ModalShare) => void;
  modalFunding: ModalFunding;
  setModalFunding: (val: ModalFunding) => void;
  modalSourceSelector: ModalSourceSelector;
  setModalSourceSelector: (val: ModalSourceSelector) => void;
  modalBoost: ModalBoost;
  setModalBoost: (val: ModalBoost) => void;
  publicBoostMessagesRefreshTrigger: number;
  bumpPublicBoostMessagesRefresh: () => void;
  modalBoostMessageError: ModalBoostMessageError;
  setModalBoostMessageError: (val: ModalBoostMessageError) => void;
  modalBoostMintRateLimit: ModalBoostMintRateLimit;
  setModalBoostMintRateLimit: (val: ModalBoostMintRateLimit) => void;
  modalLoginRequired: ModalMessage;
  setModalLoginRequired: (val: ModalMessage) => void;
  modalDisclaimer: ModalBasic;
  setModalDisclaimer: (val: ModalBasic) => void;
};

const ModalsContext = createContext<ModalsContextType | undefined>(undefined);

const defaultModalPlaylistAddTo = {
  channel: null,
  item: null,
  clip: null,
  item_soundbite: null,
  addByRSSResourceData: null,
  addByRSSHashId: null,
};

const defaultModalClip = {
  channel: null,
  item: null,
};

const defaultModalClipCreated = {
  clip: null,
};

const defaultModalBoost = {
  channel: null,
  item: null,
};

const defaultModalFunding = {
  channel_fundings: [],
  item_fundings: [],
};

const defaultModalSourceSelector: ModalSourceSelector = {
  labeledItemEnclosures: [],
  actionType: null,
  itemTitle: null,
};

export const defaultModalShare = {
  channel: null,
  item: null,
  clip: null,
  item_chapter: null,
  item_soundbite: null,
  playlist: null,
  playlist_item: null,
};

const defaultModalLoginRequired: ModalMessage = {
  title: null,
  message: null,
  messageNode: null,
  actionLabel: null,
  actionHref: null,
};

const defaultModalBoostMessageError = {
  title: null,
  message: null,
  primaryActionI18nKey: null,
  onSendAnyway: null,
  onCancel: null,
};

const defaultModalBoostMintRateLimit: ModalBoostMintRateLimit = {
  message: null,
};

export const ModalsProvider = ({ children }: { children: ReactNode }) => {
  const [modalAuthLogin, setModalAuthLogin] = useState<ModalBasic>({ isOpen: false });
  const [modalSignUp, setModalSignUp] = useState<ModalBasic>({ isOpen: false });
  const [modalPlaylistAddTo, setModalPlaylistAddTo] =
    useState<ModalPlaylistAddToState>(defaultModalPlaylistAddTo);
  const [modalClip, setModalClip] = useState<ModalClip>(defaultModalClip);
  const [modalClipCreated, setModalClipCreated] =
    useState<ModalClipCreated>(defaultModalClipCreated);
  const [modalMediaPlayerIsOpen, setModalMediaPlayerIsOpen] = useState<boolean>(false);
  const [modalShare, setModalShare] = useState<ModalShare>(defaultModalShare);
  const [modalFunding, setModalFunding] = useState<ModalFunding>(defaultModalFunding);
  const [modalSourceSelector, setModalSourceSelector] = useState<ModalSourceSelector>(
    defaultModalSourceSelector
  );
  const [modalBoost, setModalBoost] = useState<ModalBoost>(defaultModalBoost);
  const [publicBoostMessagesRefreshTrigger, setPublicBoostMessagesRefreshTrigger] = useState(0);
  const bumpPublicBoostMessagesRefresh = () => {
    setPublicBoostMessagesRefreshTrigger((previous) => previous + 1);
  };
  const [modalBoostMessageError, setModalBoostMessageError] = useState<ModalBoostMessageError>(
    defaultModalBoostMessageError
  );
  const [modalBoostMintRateLimit, setModalBoostMintRateLimit] = useState<ModalBoostMintRateLimit>(
    defaultModalBoostMintRateLimit
  );
  const [modalLoginRequired, setModalLoginRequired] =
    useState<ModalMessage>(defaultModalLoginRequired);
  const [modalDisclaimer, setModalDisclaimer] = useState<ModalBasic>({ isOpen: false });

  return (
    <ModalsContext.Provider
      value={{
        modalAuthLogin,
        setModalAuthLogin,
        modalSignUp,
        setModalSignUp,
        modalPlaylistAddTo,
        setModalPlaylistAddTo,
        modalClip,
        setModalClip,
        modalClipCreated,
        setModalClipCreated,
        modalMediaPlayerIsOpen,
        setModalMediaPlayerIsOpen,
        modalShare,
        setModalShare,
        modalFunding,
        setModalFunding,
        modalSourceSelector,
        setModalSourceSelector,
        modalBoost,
        setModalBoost,
        publicBoostMessagesRefreshTrigger,
        bumpPublicBoostMessagesRefresh,
        modalBoostMessageError,
        setModalBoostMessageError,
        modalBoostMintRateLimit,
        setModalBoostMintRateLimit,
        modalLoginRequired,
        setModalLoginRequired,
        modalDisclaimer,
        setModalDisclaimer,
      }}
    >
      {children}
    </ModalsContext.Provider>
  );
};

export const useModals = () => {
  const context = useContext(ModalsContext);
  if (!context) {
    throw new Error('useModals must be used within a ModalsProvider');
  }
  return context;
};
