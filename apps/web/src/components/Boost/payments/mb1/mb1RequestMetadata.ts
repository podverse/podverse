import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { request } from '@podverse/helpers-requests';
import type { MetaBoost } from '@podverse/v4v-metaboost';
import {
  buildMb1CreateBoostRequest,
  isMetaboostMb1CreateBoostResponse,
  mb1ConfirmPaymentUrlFromBoostPostUrl,
} from '@podverse/v4v-metaboost';

import { WEB_APP_VERSION } from '../../../../config/webAppVersion';
import type { Mb1RssContext } from '../../donateMb1RssContext';

type RequestMb1MetadataParams = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  mb1RssContext?: Mb1RssContext | null;
  appName: string;
  message: string;
  yourName: string;
  metaBoost: MetaBoost;
  totalAmountToCreator: number;
  totalAmountToApp: number;
};

export type Mb1MetadataResult = {
  desc: string;
  messageGuid: string;
  confirmUrl: string;
};

const derivePaymentDesc = (message: string, appName: string): string => {
  const trimmed = message.trim();
  if (trimmed.length > 0) {
    return trimmed;
  }
  return `${appName} boost`;
};

export const requestMb1Metadata = async ({
  channel,
  item,
  mb1RssContext,
  appName,
  message,
  yourName,
  metaBoost,
  totalAmountToCreator,
  totalAmountToApp,
}: RequestMb1MetadataParams): Promise<Mb1MetadataResult> => {
  const totalMsat = Math.max(0, Math.round((totalAmountToCreator + totalAmountToApp) * 1000));
  const feedGuidRaw = mb1RssContext?.feedGuid ?? channel?.podcast_guid;
  const feedTitleRaw = mb1RssContext?.feedTitle ?? channel?.title;
  if (feedGuidRaw === undefined || feedGuidRaw === null || feedGuidRaw.trim() === '') {
    throw new Error('MetaBoost MB1 boost requires feed_guid');
  }
  if (feedTitleRaw === undefined || feedTitleRaw === null || feedTitleRaw.trim() === '') {
    throw new Error('MetaBoost MB1 boost requires feed_title');
  }
  const feedGuid = feedGuidRaw;
  const feedTitle = feedTitleRaw;

  const itemGuid = mb1RssContext?.itemGuid ?? item?.guid;
  const itemTitle = mb1RssContext?.itemTitle ?? item?.title;

  const requestBody = buildMb1CreateBoostRequest({
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

  const { status, data: responseData } = await request<unknown>(metaBoost.node, {
    data: requestBody,
    method: 'POST',
  });
  if (status < 200 || status >= 300) {
    throw new Error('MetaBoost metadata request failed');
  }

  if (!isMetaboostMb1CreateBoostResponse(responseData)) {
    throw new Error('Invalid MetaBoost MB1 response');
  }

  return {
    desc: derivePaymentDesc(message, appName),
    messageGuid: responseData.message_guid,
    confirmUrl: mb1ConfirmPaymentUrlFromBoostPostUrl(metaBoost.node),
  };
};
