import {
  getErrorResponseBodyCode,
  getErrorResponseBodyMessage,
  getErrorResponseStatus,
} from '@podverse/helpers';
import { request } from '@podverse/helpers-requests';
import type { MbV1CreateBoostIngestBody, MetaBoost } from '@podverse/v4v-metaboost';
import {
  buildMbV1CreateBoostRequest,
  fetchMbV1BoostCapability,
  isMetaboostMbV1CreateBoostResponse,
  isMetaboostMbV1IngestNodeUrl,
  MetaboostSenderBlockedPostError,
  normalizeMetaboostMbV1IngestNodeUrl,
} from '@podverse/v4v-metaboost';

import { WEB_APP_VERSION } from '../../../../config/webAppVersion';
import { getApiRequestService } from '../../../../factories/apiRequestService';

type PostMbV1BoostMessageParams = {
  appName: string;
  message: string;
  yourName: string;
  metaBoost: MetaBoost;
  totalAmountToCreator: number;
  totalAmountToApp: number;
  senderGuid: string;
  onMetaboostUnreachable: () => Promise<void>;
};

export const postMbV1BoostMessage = async ({
  appName,
  message,
  yourName,
  metaBoost,
  totalAmountToCreator,
  totalAmountToApp,
  senderGuid,
  onMetaboostUnreachable,
}: PostMbV1BoostMessageParams): Promise<string | null> => {
  try {
    await fetchMbV1BoostCapability(metaBoost.node, { senderGuid });
  } catch {
    await onMetaboostUnreachable();
    return null;
  }

  const totalMsat = Math.max(0, Math.round((totalAmountToCreator + totalAmountToApp) * 1000));

  const requestBody = buildMbV1CreateBoostRequest({
    totalMsat,
    appName,
    appVersion: WEB_APP_VERSION,
    action: 'boost',
    message,
    yourName,
  });

  const body: MbV1CreateBoostIngestBody = {
    ...requestBody,
    sender_guid: senderGuid,
  };

  const normalizedIngestUrl = normalizeMetaboostMbV1IngestNodeUrl(metaBoost.node);
  const bodyJson = JSON.stringify(body);
  const mint = await getApiRequestService().reqMetaboostMbrssV1MintAppAssertion({
    ingest_url: normalizedIngestUrl,
    body_json: bodyJson,
  });
  if (!isMetaboostMbV1IngestNodeUrl(mint.ingest_url)) {
    throw new Error('Minted app assertion ingest URL must target mb-v1 endpoint');
  }

  let responseData: unknown;
  try {
    const res = await request<unknown>(mint.ingest_url, {
      method: 'POST',
      data: bodyJson,
      headers: {
        Authorization: mint.authorization,
        'Content-Type': 'application/json',
      },
    });
    responseData = res.data;
  } catch (error: unknown) {
    if (
      getErrorResponseStatus(error) === 403 &&
      getErrorResponseBodyCode(error) === 'sender_blocked'
    ) {
      const msg = getErrorResponseBodyMessage(error);
      throw new MetaboostSenderBlockedPostError(
        msg !== undefined && msg.trim() !== '' ? msg.trim() : ''
      );
    }
    throw error;
  }

  if (!isMetaboostMbV1CreateBoostResponse(responseData)) {
    throw new Error('Invalid MetaBoost mb-v1 response');
  }

  return responseData.message_guid;
};
