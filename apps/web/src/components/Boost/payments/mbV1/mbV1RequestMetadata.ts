import { request } from '@podverse/helpers-requests';
import type { MbV1CreateBoostIngestBody, MetaBoost } from '@podverse/v4v-metaboost';
import {
  buildMbV1CreateBoostRequest,
  fetchMbV1BoostCapability,
  isMetaboostMbV1CreateBoostResponse,
  isMetaboostMbV1IngestNodeUrl,
  MetaboostCapabilityPreflightError,
  normalizeMetaboostMbV1IngestNodeUrl,
  throwKnownMetaboostPostError,
  V4V_ACTION_TYPE,
} from '@podverse/v4v-metaboost';

import { WEB_APP_VERSION } from '../../../../config/webAppVersion';
import { getApiRequestService } from '../../../../factories/apiRequestService';

type PostMbV1BoostMessageParams = {
  appName: string;
  message: string;
  yourName: string;
  metaBoost: MetaBoost;
  /** Total millisats for the boost; must match summed Lightning recipient plan. */
  metaboostTotalMsat: number;
  senderGuid: string;
  onMetaboostUnreachable: () => Promise<void>;
};

export const postMbV1BoostMessage = async ({
  appName,
  message,
  yourName,
  metaBoost,
  metaboostTotalMsat,
  senderGuid,
  onMetaboostUnreachable,
}: PostMbV1BoostMessageParams): Promise<string> => {
  try {
    await fetchMbV1BoostCapability(metaBoost.node, { senderGuid });
  } catch {
    await onMetaboostUnreachable();
    throw new MetaboostCapabilityPreflightError();
  }

  const totalMsat = Math.max(0, Math.round(metaboostTotalMsat));

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

  let responseData: unknown;
  try {
    responseData = await postIngestBody(JSON.stringify(body));
  } catch (error: unknown) {
    throwKnownMetaboostPostError(error);
    throw error;
  }

  if (!isMetaboostMbV1CreateBoostResponse(responseData)) {
    throw new Error('Invalid MetaBoost mb-v1 response');
  }

  return responseData.message_guid;
};
