import { sleep } from '@podverse/helpers';
import type { OpmlImportStatusResponse } from '@podverse/helpers-requests';

const STATUS_POLL_DELAY_MS = 3000;
/** OPML jobs can process many feeds; allow up to ~5 minutes. */
const STATUS_POLL_MAX_ATTEMPTS = 100;

type PollOpmlImportStatusParams = {
  requestId: string;
  fetchStatus: (requestId: string) => Promise<OpmlImportStatusResponse>;
  onStatusUpdate: (response: OpmlImportStatusResponse) => void | Promise<void>;
};

export const pollOpmlImportStatus = async ({
  requestId,
  fetchStatus,
  onStatusUpdate,
}: PollOpmlImportStatusParams): Promise<OpmlImportStatusResponse> => {
  for (let attempt = 0; attempt < STATUS_POLL_MAX_ATTEMPTS; attempt += 1) {
    const statusResponse = await fetchStatus(requestId);
    await onStatusUpdate(statusResponse);

    if (statusResponse.status === 'completed' || statusResponse.status === 'failed') {
      return statusResponse;
    }

    await sleep(STATUS_POLL_DELAY_MS);
  }

  throw new Error(`OPML import status timed out. Request ID: ${requestId}`);
};
