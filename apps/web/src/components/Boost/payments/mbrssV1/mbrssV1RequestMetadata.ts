import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { request } from '@podverse/helpers-requests';
import type { MbrssV1CreateBoostIngestBody, MetaBoost } from '@podverse/v4v-metaboost';
import {
  buildMbrssV1CreateBoostRequest,
  isMetaboostMbrssV1CreateBoostResponse,
} from '@podverse/v4v-metaboost';

import { WEB_APP_VERSION } from '../../../../config/webAppVersion';
import type { MbrssV1RssContext } from '../../donateMbrssV1RssContext';

type PostMbrssV1BoostMessageParams = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  mbrssV1RssContext?: MbrssV1RssContext | null;
  appName: string;
  message: string;
  yourName: string;
  metaBoost: MetaBoost;
  totalAmountToCreator: number;
  totalAmountToApp: number;
  senderGuid: string;
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
  totalAmountToCreator,
  totalAmountToApp,
  senderGuid,
}: PostMbrssV1BoostMessageParams): Promise<string> => {
  const totalMsat = Math.max(0, Math.round((totalAmountToCreator + totalAmountToApp) * 1000));
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
    action: 'boost',
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

  const { status, data: responseData } = await request<unknown>(metaBoost.node, {
    method: 'POST',
    data: body,
  });

  if (status < 200 || status >= 300) {
    throw new Error('MetaBoost metadata request failed');
  }

  if (!isMetaboostMbrssV1CreateBoostResponse(responseData)) {
    throw new Error('Invalid MetaBoost mbrss-v1 response');
  }

  return responseData.message_guid;
};
