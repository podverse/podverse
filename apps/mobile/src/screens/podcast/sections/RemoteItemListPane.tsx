import type { ReactElement, ReactNode } from 'react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

import type { RemoteItemsResponse } from '@podverse/helpers';
import type { ApiRequestService } from '@podverse/helpers-requests';

import { RemoteItemListRow } from '../../../components/content';
import { useOpenRemoteItemListEntry } from '../../../hooks/useOpenRemoteItemListEntry';
import type { RemoteItemListEntry } from '../../../lib/remoteItems/remoteItemListEntries';
import { toRemoteItemListEntries } from '../../../lib/remoteItems/remoteItemListEntries';
import { PodcastSectionList } from './PodcastSectionList';
import type { PodcastSectionPage } from './usePodcastSectionRows';
import { usePodcastSectionRows } from './usePodcastSectionRows';

const remoteItemKeyExtractor = (entry: RemoteItemListEntry): string => entry.key;

export type RemoteItemListPaneProps = {
  /** Catalog key for the list's spoken name. */
  accessibilityLabelKey: string;
  emptyMessageKey: string;
  /** One call returns the whole list; there is no second page. */
  fetchResponse: (api: ApiRequestService) => Promise<RemoteItemsResponse>;
  listHeader: ReactNode;
  onRefreshChannel: () => Promise<void>;
  /** Row testIDs are `${rowTestIDPrefix}-${index}`. */
  rowTestIDPrefix: string;
  testID: string;
};

/**
 * A remote-item list: parsed rows open their screen, and remote stubs open the provider search
 * detail for their feed. The caller supplies the request. The whole list arrives in one response.
 */
export function RemoteItemListPane({
  accessibilityLabelKey,
  emptyMessageKey,
  fetchResponse,
  listHeader,
  onRefreshChannel,
  rowTestIDPrefix,
  testID,
}: RemoteItemListPaneProps): ReactElement {
  const { t } = useTranslation();
  const untitledLabel = t('misc.untitled');
  const openEntry = useOpenRemoteItemListEntry();

  const fetchPage = useCallback(
    async (api: ApiRequestService): Promise<PodcastSectionPage<RemoteItemListEntry>> => {
      const response = await fetchResponse(api);
      return { hasMore: false, rows: toRemoteItemListEntries(response) };
    },
    [fetchResponse]
  );

  const { errorKey, isInitialLoading, isRefreshing, refresh, retry, rows } =
    usePodcastSectionRows(fetchPage);

  return (
    <PodcastSectionList
      accessibilityLabel={t(accessibilityLabelKey)}
      emptyMessageKey={emptyMessageKey}
      errorKey={errorKey}
      isInitialLoading={isInitialLoading}
      isRefreshing={isRefreshing}
      keyExtractor={remoteItemKeyExtractor}
      listHeader={listHeader}
      onRefresh={() => {
        void onRefreshChannel();
        refresh();
      }}
      onRetry={retry}
      renderRow={({ index, row }) => (
        <RemoteItemListRow
          entry={row}
          onPress={openEntry}
          testID={`${rowTestIDPrefix}-${index}`}
          untitledLabel={untitledLabel}
        />
      )}
      rows={rows}
      testID={testID}
    />
  );
}
