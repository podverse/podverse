import { useCallback } from 'react';

import { generateQueueResourceAbridgedIndex } from '@podverse/helpers';

import { useAccount } from '../contexts/Account';
import { useQueueResourcesAbridgedIndex } from '../contexts/QueueResourcesAbridgedIndex';
import { getApiRequestService } from '../factories/apiRequestService';

export function useQueueResourcesAbridgedLoad() {
  const { setQueueResourcesAbridgedIndex } = useQueueResourcesAbridgedIndex();
  const { loggedInAccount } = useAccount();

  return useCallback(async () => {
    if (!loggedInAccount) {
      return;
    }

    const resources = await getApiRequestService().reqQueueResourcesGetAllByAccountAbridged();
    const index = generateQueueResourceAbridgedIndex(resources);
    setQueueResourcesAbridgedIndex(index);
  }, []);
}
