import type { MbrssV1CreateBoostIngestBody } from './mbrssV1CreateBoost.js';
import {
  buildMbrssV1CreateBoostRequest,
  isMetaboostMbrssV1CreateBoostResponse,
  V4V_ACTION_TYPE,
} from './mbrssV1CreateBoost.js';
import { fetchMbrssV1BoostCapability } from './mbrssV1FetchCapability.js';
import { normalizeMetaboostMbrssV1IngestNodeUrl } from './mbrssV1IngestUrl.js';
import type { MetaBoost } from './metaBoost.js';
import { MetaboostCapabilityPreflightError } from './metaboostCapabilityPreflightError.js';
import { throwKnownMetaboostPostError } from './metaboostPostErrorHandling.js';

export type PostMbrssV1BoostTransport = {
  mintAppAssertion: (params: {
    ingestUrl: string;
    bodyJson: string;
  }) => Promise<{ authorization: string; ingestUrl: string }>;
  postIngest: (params: {
    ingestUrl: string;
    authorization: string;
    bodyJson: string;
  }) => Promise<unknown>;
};

export type PostMbrssV1BoostResult = { posted: false } | { posted: true; messageGuid: string };

export type PostMbrssV1BoostAfterLargestSplitParams = {
  largestSplitSucceeded: boolean;
  metaBoost: MetaBoost;
  senderGuid: string | null;
  totalMsat: number;
  appName: string;
  appVersion?: string;
  feedGuid: string | null | undefined;
  feedTitle: string | null | undefined;
  itemGuid?: string;
  itemTitle?: string;
  message: string;
  yourName: string;
  transport: PostMbrssV1BoostTransport;
  onMetaboostUnreachable: () => Promise<void>;
};

export const postMbrssV1BoostAfterLargestSplit = async ({
  largestSplitSucceeded,
  metaBoost,
  senderGuid,
  totalMsat,
  appName,
  appVersion,
  feedGuid: feedGuidRaw,
  feedTitle: feedTitleRaw,
  itemGuid,
  itemTitle,
  message,
  yourName,
  transport,
  onMetaboostUnreachable,
}: PostMbrssV1BoostAfterLargestSplitParams): Promise<PostMbrssV1BoostResult> => {
  if (!largestSplitSucceeded || senderGuid === null || senderGuid.trim() === '') {
    return { posted: false };
  }

  try {
    await fetchMbrssV1BoostCapability(metaBoost.node, { senderGuid });
  } catch {
    await onMetaboostUnreachable();
    throw new MetaboostCapabilityPreflightError();
  }

  const roundedTotalMsat = Math.max(0, Math.round(totalMsat));
  if (feedGuidRaw === undefined || feedGuidRaw === null || feedGuidRaw.trim() === '') {
    throw new Error('MetaBoost mbrss-v1 boost requires feed_guid');
  }
  if (feedTitleRaw === undefined || feedTitleRaw === null || feedTitleRaw.trim() === '') {
    throw new Error('MetaBoost mbrss-v1 boost requires feed_title');
  }
  const appVersionForRequest =
    appVersion !== undefined && appVersion.trim() !== '' ? appVersion : undefined;

  const requestBody = buildMbrssV1CreateBoostRequest({
    totalMsat: roundedTotalMsat,
    appName,
    appVersion: appVersionForRequest,
    action: V4V_ACTION_TYPE.BOOST,
    feedGuid: feedGuidRaw,
    feedTitle: feedTitleRaw,
    message,
    yourName,
    itemGuid,
    itemTitle,
  });

  const body: MbrssV1CreateBoostIngestBody = {
    ...requestBody,
    sender_guid: senderGuid,
  };
  const bodyJson = JSON.stringify(body);
  const ingestUrl = normalizeMetaboostMbrssV1IngestNodeUrl(metaBoost.node);
  const mint = await transport.mintAppAssertion({ ingestUrl, bodyJson });

  let responseData: unknown;
  try {
    responseData = await transport.postIngest({
      ingestUrl: mint.ingestUrl,
      authorization: mint.authorization,
      bodyJson,
    });
  } catch (error: unknown) {
    throwKnownMetaboostPostError(error);
    throw error;
  }

  if (!isMetaboostMbrssV1CreateBoostResponse(responseData)) {
    throw new Error('Invalid MetaBoost mbrss-v1 response');
  }

  return { posted: true, messageGuid: responseData.message_guid };
};
