import type { DTOChannel, DTOItem } from '@podverse/helpers';
import { request } from '@podverse/helpers-requests';
import type { MetaBoost } from '@podverse/v4v-metaboost';
import { postMbrssV1BoostAfterLargestSplit } from '@podverse/v4v-metaboost';

import { WEB_APP_VERSION } from '../../../../config/webAppVersion';
import { getApiRequestService } from '../../../../factories/apiRequestService';

type PostMbrssV1BoostMessageParams = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  appName: string;
  message: string;
  yourName: string;
  metaBoost: MetaBoost;
  /** Total millisats for the boost; must match summed Lightning recipient plan (same as BLIP value_msat_total). */
  metaboostTotalMsat: number;
  senderGuid: string;
  largestSplitSucceeded: boolean;
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
  appName,
  message,
  yourName,
  metaBoost,
  metaboostTotalMsat,
  senderGuid,
  largestSplitSucceeded,
  onMetaboostUnreachable,
}: PostMbrssV1BoostMessageParams): Promise<string | undefined> => {
  const result = await postMbrssV1BoostAfterLargestSplit({
    largestSplitSucceeded,
    metaBoost,
    senderGuid,
    totalMsat: metaboostTotalMsat,
    appName,
    appVersion: WEB_APP_VERSION,
    feedGuid: channel?.podcast_guid,
    feedTitle: channel?.title,
    itemGuid: item?.guid ?? undefined,
    itemTitle: item?.title ?? undefined,
    message,
    yourName,
    onMetaboostUnreachable,
    transport: {
      mintAppAssertion: async ({ ingestUrl, bodyJson }) => {
        const mint = await getApiRequestService().reqMetaboostMbrssV1MintAppAssertion({
          ingest_url: ingestUrl,
          body_json: bodyJson,
        });
        return {
          authorization: mint.authorization,
          ingestUrl: mint.ingest_url,
        };
      },
      postIngest: async ({ ingestUrl, authorization, bodyJson }) => {
        const res = await request<unknown>(ingestUrl, {
          method: 'POST',
          data: bodyJson,
          headers: {
            Authorization: authorization,
            'Content-Type': 'application/json',
          },
        });
        return res.data;
      },
    },
  });
  if (!result.posted) {
    return;
  }
  return result.messageGuid;
};
