import { useTranslations } from 'next-intl';

import { useModals } from '../../contexts/Modals';
import { SourceSelectors } from '../SourceSelectors/SourceSelectors';
import { Modal, MODAL_CONTENT_MAX_WIDTH } from './Modal';

export const ModalSourceSelector: React.FC = () => {
  const tMediaPlayer = useTranslations('media_player');
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
      ariaLabel={tMediaPlayer('source.select_source')}
      modalContentMaxWidth={MODAL_CONTENT_MAX_WIDTH}
    >
      <SourceSelectors
        labeledItemEnclosures={modalSourceSelector.labeledItemEnclosures}
        actionType={modalSourceSelector.actionType}
        itemTitle={modalSourceSelector.itemTitle}
      />
    </Modal>
  );
};
