import type { RemoteItemsResponse } from '@podverse/helpers';
import { Accordion } from '@podverse/ui';

import { ContentPodrollHeader } from './ContentPodrollHeader';
import { ContentPodrollRows } from './ContentPodrollRows';

import styles from '../../../styles/components/Content/Podroll/ContentPodrollAccordion.module.scss';

type ContentPodrollAccordionProps = {
  remoteItemsResponse: RemoteItemsResponse;
  defaultOpen?: boolean;
};

export const ContentPodrollAccordion: React.FC<ContentPodrollAccordionProps> = ({
  remoteItemsResponse,
  defaultOpen,
}) => {
  return (
    <Accordion
      contentClassName={styles.accordion}
      header={<ContentPodrollHeader />}
      open={defaultOpen}
    >
      <ContentPodrollRows remoteItemsResponse={remoteItemsResponse} />
    </Accordion>
  );
};
