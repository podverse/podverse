'use client';

import { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';

import { MediumEnum } from '@podverse/helpers';
import { copyToClipboard } from '@podverse/helpers-browser';
import { Button, FormStack, Modal, TextInput } from '@podverse/ui';

import { WEB } from '../../constants/web';
import { defaultModalShare, useModals } from '../../contexts/Modals';

type ModalShareInput = {
  name: string;
  value: string;
  eyebrow?: string;
};

export const ModalShare: React.FC = () => {
  const tFeatures = useTranslations('features');
  const tMedia = useTranslations('media');
  const tMisc = useTranslations('misc');
  const tInfo = useTranslations('info');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { modalShare, setModalShare, setModalEmbedBuilder } = useModals();

  React.useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const isOpen = modalShare.channel !== null || modalShare.playlist !== null;

  if (modalShare.channel === null && modalShare.playlist === null) {
    return null;
  }

  const handleCopy = (value: string, idx: number) => {
    copyToClipboard(value);
    setCopiedIndex(idx);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  const handleCreateEmbed = () => {
    setModalEmbedBuilder({
      channel: modalShare.channel,
      item: modalShare.item,
      clip: modalShare.clip,
      item_chapter: modalShare.item_chapter,
      item_soundbite: modalShare.item_soundbite,
      playlist: modalShare.playlist,
    });
    setModalShare(defaultModalShare);
  };

  const shareInputs: ModalShareInput[] = [];

  if (modalShare.playlist) {
    shareInputs.push({
      name: 'playlist',
      value: `${WEB.origin}/playlist/${modalShare.playlist.id_text}`,
      eyebrow: tMedia('playlist.playlist'),
    });
  }

  if (
    modalShare.channel !== null &&
    (modalShare.channel.medium_id === MediumEnum.Podcast ||
      modalShare.channel.medium_id === MediumEnum.Video)
  ) {
    shareInputs.push({
      name: 'podcast',
      value: `${WEB.origin}/podcast/${modalShare.channel.id_text}`,
      eyebrow: tMedia('podcast.podcast'),
    });

    if (modalShare.item) {
      shareInputs.push({
        name: 'episode',
        value: `${WEB.origin}/episode/${modalShare.item.id_text}`,
        eyebrow: tMedia('podcast.episode'),
      });
    }
  } else if (modalShare.channel !== null && modalShare.channel.medium_id === MediumEnum.Music) {
    shareInputs.push({
      name: 'album',
      value: `${WEB.origin}/album/${modalShare.channel.id_text}`,
      eyebrow: tMedia('music.album'),
    });

    if (modalShare.item) {
      shareInputs.push({
        name: 'track',
        value: `${WEB.origin}/track/${modalShare.item.id_text}`,
        eyebrow: tMedia('music.track'),
      });
    }
  }

  if (modalShare.clip) {
    shareInputs.push({
      name: 'clip.clip',
      value: `${WEB.origin}/clip/${modalShare.clip.id_text}`,
      eyebrow: tFeatures('clip.clip'),
    });
  }

  if (modalShare.item_chapter) {
    shareInputs.push({
      name: 'chapter.chapter',
      value: `${WEB.origin}/chapter/${modalShare.item_chapter.id_text}`,
      eyebrow: tInfo('chapter.chapter'),
    });
  }

  if (modalShare.item_soundbite) {
    shareInputs.push({
      name: 'soundbite.official_clip',
      value: `${WEB.origin}/official-clip/${modalShare.item_soundbite.id_text}`,
      eyebrow: tInfo('soundbite.official_clip'),
    });
  }

  return (
    <Modal
      header={tFeatures('share')}
      isOpen={isOpen}
      onClose={() => setModalShare(defaultModalShare)}
      closeButtonAriaLabel={tMisc('close_modal')}
      ariaLabel={tFeatures('share')}
    >
      <FormStack>
        {shareInputs.map((input, idx) => (
          <TextInput
            key={input.name}
            type="text"
            name={input.name}
            value={input.value}
            eyebrow={input.eyebrow}
            button={{
              label: copiedIndex === idx ? tFeatures('copied') : tFeatures('copy'),
              onClick: () => handleCopy(input.value, idx),
            }}
            readOnly
          />
        ))}
        <div data-testid="share-create-embed">
          <Button type="button" onClick={handleCreateEmbed}>
            {tFeatures('create_embed')}
          </Button>
        </div>
      </FormStack>
    </Modal>
  );
};
