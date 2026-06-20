import { useTranslations } from 'next-intl';

import { Modal } from '@podverse/ui';

import { useModals } from '../../contexts/Modals';
import { SourceSelectors } from '../SourceSelectors/SourceSelectors';

export const ModalSourceSelector: React.FC = () => {
  const tMediaPlayer = useTranslations('media_player');
  const tMisc = useTranslations('misc');
  const { modalSourceSelector, setModalSourceSelector } = useModals();

  const isOpen = modalSourceSelector.labeledItemEnclosures.length > 0;

  return (
    <Modal
      header={tMediaPlayer('source.select_source')}
      isOpen={isOpen}
      onClose={() =>
        setModalSourceSelector({
          labeledItemEnclosures: [],
          actionType: null,
          itemTitle: null,
        })
      }
      closeButtonAriaLabel={tMisc('close_modal')}
      ariaLabel={tMediaPlayer('source.select_source')}
    >
      <SourceSelectors
        labeledItemEnclosures={modalSourceSelector.labeledItemEnclosures}
        actionType={modalSourceSelector.actionType}
        itemTitle={modalSourceSelector.itemTitle}
        onLoadInPlayerWithSource={modalSourceSelector.onLoadInPlayerWithSource}
      />
    </Modal>
  );
};
