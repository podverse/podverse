import type { RemoteItemsResponse } from '@podverse/helpers';

import { remoteItemsResponseHasRows } from '../remoteItemStubRow';
import { ContentPodrollAccordion } from './ContentPodrollAccordion';
import { ContentPodrollRows } from './ContentPodrollRows';

import styles from '../../../styles/components/Content/Podroll/ContentPodroll.module.scss';

type ContentPodrollProps = {
  remoteItemsResponse: RemoteItemsResponse | null;
  defaultOpen?: boolean;
  isAccordion?: boolean;
};

export const ContentPodroll = ({
  remoteItemsResponse,
  defaultOpen,
  isAccordion,
}: ContentPodrollProps) => {
  if (!remoteItemsResponseHasRows(remoteItemsResponse)) {
    return null;
  }

  if (isAccordion) {
    return (
      <div data-testid="channel-podroll">
        <ContentPodrollAccordion
          remoteItemsResponse={remoteItemsResponse}
          defaultOpen={defaultOpen}
        />
      </div>
    );
  }

  return (
    <div className={styles.listView} data-testid="channel-podroll">
      <ContentPodrollRows remoteItemsResponse={remoteItemsResponse} />
    </div>
  );
};
