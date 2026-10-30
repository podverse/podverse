import type { RemoteItemsResponse } from '@podverse/helpers';
import { Accordion } from '@podverse/ui';

import { ContentPodrollRows } from '../Podroll/ContentPodrollRows';
import { remoteItemsResponseHasRows } from '../remoteItemStubRow';
import { ContentRemoteItemsHeader } from './ContentRemoteItemsHeader';

import styles from '../../../styles/components/Content/Podroll/ContentPodroll.module.scss';
import accordionStyles from '../../../styles/components/Content/Podroll/ContentPodrollAccordion.module.scss';

type ContentRemoteItemsProps = {
  remoteItemsResponse: RemoteItemsResponse | null;
  defaultOpen?: boolean;
  isAccordion?: boolean;
};

export const ContentRemoteItems = ({
  remoteItemsResponse,
  defaultOpen,
  isAccordion,
}: ContentRemoteItemsProps) => {
  if (!remoteItemsResponseHasRows(remoteItemsResponse)) {
    return null;
  }

  if (isAccordion) {
    return (
      <div data-testid="channel-remote-items">
        <Accordion
          contentClassName={accordionStyles.accordion}
          header={<ContentRemoteItemsHeader />}
          open={defaultOpen}
        >
          <ContentPodrollRows remoteItemsResponse={remoteItemsResponse} />
        </Accordion>
      </div>
    );
  }

  return (
    <div className={styles.listView} data-testid="channel-remote-items">
      <ContentPodrollRows remoteItemsResponse={remoteItemsResponse} />
    </div>
  );
};
