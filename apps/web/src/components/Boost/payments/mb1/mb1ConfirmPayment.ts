import { request } from '@podverse/helpers-requests';
import { buildMb1ConfirmPaymentRequestFromRecipientStatuses } from '@podverse/v4v-metaboost';

import type { RecipientStatus } from '../../types.js';

export type Mb1ConfirmTarget = {
  messageGuid: string;
  confirmUrl: string;
};

export const confirmMb1Payment = async (
  confirmTarget: Mb1ConfirmTarget,
  recipientStatuses: RecipientStatus[]
): Promise<void> => {
  const requestBody = buildMb1ConfirmPaymentRequestFromRecipientStatuses({
    messageGuid: confirmTarget.messageGuid,
    recipientStatuses,
  });
  if (requestBody === null) {
    return;
  }
  const response = await request<unknown>(confirmTarget.confirmUrl, {
    data: requestBody,
    method: 'POST',
  });
  if (response.status >= 200 && response.status < 300) {
    return;
  }
  throw new Error(`MB1 confirm request failed with status code ${response.status}`);
};
