import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { request } from '@podverse/helpers-requests';
import type { MetaBoost } from '@podverse/v4v-metaboost';
import { buildBoostMetadataRequest, isBoostMetadataResponse } from '@podverse/v4v-metaboost';

type RequestMb1MetadataParams = {
  channel: DTOChannel | null;
  item: DTOItem | null;
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

export const requestMb1Metadata = async ({
  channel,
  item,
  appName,
  message,
  yourName,
  metaBoost,
  totalAmountToCreator,
  totalAmountToApp,
}: RequestMb1MetadataParams): Promise<Mb1MetadataResult> => {
  const totalMsat = Math.max(0, Math.round((totalAmountToCreator + totalAmountToApp) * 1000));
  const requestBody = buildBoostMetadataRequest({
    action: 'boost',
    split: 1,
    value_msat: totalMsat,
    value_msat_total: totalMsat,
    message: message.trim() || undefined,
    app_name: appName,
    sender_name: yourName.trim() || undefined,
    feed_guid: channel?.podcast_guid ?? undefined,
    feed_title: channel?.title ?? undefined,
    item_guid: item?.guid ?? undefined,
    item_title: item?.title ?? undefined,
  });

  const { status, data: responseData } = await request<unknown>(metaBoost.node, {
    data: requestBody,
    method: 'POST',
  });
  if (status < 200 || status >= 300) {
    throw new Error('MetaBoost metadata request failed');
  }

  if (!isBoostMetadataResponse(responseData)) {
    throw new Error('Invalid MetaBoost metadata response');
  }

  return {
    desc: responseData.desc,
    messageGuid: responseData.id,
    confirmUrl: responseData.url,
  };
};
