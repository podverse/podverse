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
  MBRSS_V1_AMOUNT_UNIT_SATOSHI,
  MBRSS_V1_AMOUNT_UNIT_SATOSHIS,
  V4V_ACTION_TYPE,
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
    action: V4V_ACTION_TYPE.BOOST,
    message,
    yourName,
  });

  const body: MbV1CreateBoostIngestBody = {
    ...requestBody,
    sender_guid: senderGuid,
  };

  const normalizedIngestUrl = normalizeMetaboostMbV1IngestNodeUrl(metaBoost.node);
  const postIngestBody = async (bodyJson: string): Promise<unknown> => {
    const mint = await getApiRequestService().reqMetaboostMbrssV1MintAppAssertion({
      ingest_url: normalizedIngestUrl,
      body_json: bodyJson,
    });
    if (!isMetaboostMbV1IngestNodeUrl(mint.ingest_url)) {
      throw new Error('Minted app assertion ingest URL must target mb-v1 endpoint');
    }

    const res = await request<unknown>(mint.ingest_url, {
      method: 'POST',
      data: bodyJson,
      headers: {
        Authorization: mint.authorization,
        'Content-Type': 'application/json',
      },
    });
    return res.data;
  };

  const throwIfSenderBlockedError = (error: unknown): void => {
    if (
      getErrorResponseStatus(error) === 403 &&
      getErrorResponseBodyCode(error) === 'sender_blocked'
    ) {
      const msg = getErrorResponseBodyMessage(error);
      throw new MetaboostSenderBlockedPostError(
        msg !== undefined && msg.trim() !== '' ? msg.trim() : ''
      );
    }
  };

  let responseData: unknown;
  try {
    responseData = await postIngestBody(JSON.stringify(body));
  } catch (error: unknown) {
    throwIfSenderBlockedError(error);
    const message = getErrorResponseBodyMessage(error)?.toLowerCase() ?? '';
    const shouldRetryWithSingularAmountUnit =
      getErrorResponseStatus(error) === 400 &&
      requestBody.amount_unit === MBRSS_V1_AMOUNT_UNIT_SATOSHIS &&
      message.includes('amount_unit');
    if (!shouldRetryWithSingularAmountUnit) {
      throw error;
    }

    try {
      responseData = await postIngestBody(
        JSON.stringify({
          ...body,
          amount_unit: MBRSS_V1_AMOUNT_UNIT_SATOSHI,
        })
      );
    } catch (retryError: unknown) {
      throwIfSenderBlockedError(retryError);
      throw retryError;
    }
  }

  if (!isMetaboostMbV1CreateBoostResponse(responseData)) {
    throw new Error('Invalid MetaBoost mb-v1 response');
  }

  return responseData.message_guid;
};
