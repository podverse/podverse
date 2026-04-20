import {
  type DTOChannel,
  type DTOItem,
  getErrorResponseBodyCode,
  getErrorResponseBodyMessage,
  getErrorResponseStatus,
} from '@podverse/helpers';
import { request } from '@podverse/helpers-requests';
import {
  buildMbrssV1CreateBoostRequest,
  fetchMbrssV1BoostCapability,
  isMetaboostMbrssV1CreateBoostResponse,
  type MbrssV1CreateBoostIngestBody,
  type MetaBoost,
  MetaboostSenderBlockedPostError,
  normalizeMetaboostMbrssV1IngestNodeUrl,
  V4V_ACTION_TYPE,
} from '@podverse/v4v-metaboost';

import { WEB_APP_VERSION } from '../../../../config/webAppVersion';
import { getApiRequestService } from '../../../../factories/apiRequestService';
import type { MbrssV1RssContext } from '../../donateMbrssV1RssContext';

type PostMbrssV1BoostMessageParams = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  mbrssV1RssContext?: MbrssV1RssContext | null;
  appName: string;
  message: string;
  yourName: string;
  metaBoost: MetaBoost;
  /** Total millisats for the boost; must match summed Lightning recipient plan (same as BLIP value_msat_total). */
  metaboostTotalMsat: number;
  senderGuid: string;
  /** After a failed preflight GET, show UI; resolves when user dismisses (Continue or Cancel). */
  onMetaboostUnreachable: () => Promise<void>;
};

export const getMbrssV1PaymentDesc = (message: string, appName: string): string => {
  const trimmed = message.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return `${appName} boost`;
};

export const postMbrssV1BoostMessage = async ({
  channel,
  item,
  mbrssV1RssContext,
  appName,
  message,
  yourName,
  metaBoost,
  metaboostTotalMsat,
  senderGuid,
  onMetaboostUnreachable,
}: PostMbrssV1BoostMessageParams): Promise<string | null> => {
  try {
    await fetchMbrssV1BoostCapability(metaBoost.node, { senderGuid });
  } catch {
    await onMetaboostUnreachable();
    return null;
  }

  const totalMsat = Math.max(0, Math.round(metaboostTotalMsat));
  const feedGuidRaw = mbrssV1RssContext?.feedGuid ?? channel?.podcast_guid;
  const feedTitleRaw = mbrssV1RssContext?.feedTitle ?? channel?.title;
  if (feedGuidRaw === undefined || feedGuidRaw === null || feedGuidRaw.trim() === '') {
    throw new Error('MetaBoost mbrss-v1 boost requires feed_guid');
  }
  if (feedTitleRaw === undefined || feedTitleRaw === null || feedTitleRaw.trim() === '') {
    throw new Error('MetaBoost mbrss-v1 boost requires feed_title');
  }
  const feedGuid = feedGuidRaw;
  const feedTitle = feedTitleRaw;

  const itemGuid = mbrssV1RssContext?.itemGuid ?? item?.guid;
  const itemTitle = mbrssV1RssContext?.itemTitle ?? item?.title;

  const requestBody = buildMbrssV1CreateBoostRequest({
    totalMsat,
    appName,
    appVersion: WEB_APP_VERSION,
    action: V4V_ACTION_TYPE.BOOST,
    feedGuid,
    feedTitle,
    message,
    yourName,
    itemGuid: itemGuid === null || itemGuid === undefined ? undefined : itemGuid,
    itemTitle: itemTitle === null || itemTitle === undefined ? undefined : itemTitle,
  });

  const body: MbrssV1CreateBoostIngestBody = {
    ...requestBody,
    sender_guid: senderGuid,
  };

  const normalizedIngestUrl = normalizeMetaboostMbrssV1IngestNodeUrl(metaBoost.node);
  const postIngestBody = async (bodyJson: string): Promise<unknown> => {
    const mint = await getApiRequestService().reqMetaboostMbrssV1MintAppAssertion({
      ingest_url: normalizedIngestUrl,
      body_json: bodyJson,
    });

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
    throw error;
  }

  if (!isMetaboostMbrssV1CreateBoostResponse(responseData)) {
    throw new Error('Invalid MetaBoost mbrss-v1 response');
  }

  return responseData.message_guid;
};
