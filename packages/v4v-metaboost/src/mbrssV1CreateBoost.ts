import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';

/** Aligns with MetaBoost mbrss-v1 ingest / `createMbrssV1BoostSchema`. */
export const MBRSS_V1_CURRENCY_BTC = 'BTC';

/** Metaboost uses `satoshis` (see `@metaboost/helpers` `MBRSS_V1_SATOSHIS_UNIT`). */
export const MBRSS_V1_AMOUNT_UNIT_SATOSHIS = 'satoshis';

export const MBRSS_V1_BOOST_ACTION = 'boost' as const;
export const MBRSS_V1_STREAM_ACTION = 'stream' as const;

export type MbrssV1CreateBoostAction = typeof MBRSS_V1_BOOST_ACTION | typeof MBRSS_V1_STREAM_ACTION;

export type MbrssV1CreateBoostIngestBody = {
  currency: typeof MBRSS_V1_CURRENCY_BTC;
  amount: number;
  amount_unit: typeof MBRSS_V1_AMOUNT_UNIT_SATOSHIS;
  action: MbrssV1CreateBoostAction;
  app_name: string;
  feed_guid: string;
  feed_title: string;
  app_version?: string;
  sender_name?: string;
  sender_id?: string;
  message?: string | null;
  podcast_index_feed_id?: number;
  item_guid?: string;
  item_title?: string;
  time_position?: number;
};

export type BuildMbrssV1CreateBoostRequestParams = {
  totalMsat: number;
  appName: string;
  action: MbrssV1CreateBoostAction;
  feedGuid: string;
  feedTitle: string;
  message: string;
  yourName: string;
  itemGuid?: string;
  itemTitle?: string;
  appVersion?: string;
};

export const buildMbrssV1CreateBoostRequest = (
  params: BuildMbrssV1CreateBoostRequestParams
): MbrssV1CreateBoostIngestBody => {
  const amountSat = params.totalMsat / 1000;
  if (!(amountSat > 0)) {
    throw new Error('mbrss-v1 boost amount must be positive');
  }

  const body: MbrssV1CreateBoostIngestBody = {
    currency: MBRSS_V1_CURRENCY_BTC,
    amount: amountSat,
    amount_unit: MBRSS_V1_AMOUNT_UNIT_SATOSHIS,
    action: params.action,
    app_name: params.appName,
    feed_guid: params.feedGuid.trim(),
    feed_title: params.feedTitle.trim(),
  };

  if (params.appVersion !== undefined && params.appVersion.trim() !== '') {
    body.app_version = params.appVersion.trim();
  }

  const sender = params.yourName.trim();
  if (sender !== '') {
    body.sender_name = sender;
  }

  if (params.action === 'stream') {
    body.message = null;
  } else {
    const msg = params.message.trim();
    if (msg !== '') {
      body.message = msg;
    }
  }

  const itemG = params.itemGuid?.trim() ?? '';
  const itemT = params.itemTitle?.trim() ?? '';
  if (itemG !== '' && itemT !== '') {
    body.item_guid = itemG;
    body.item_title = itemT;
  }

  return body;
};

export type MetaboostMbrssV1CreateBoostResponse = {
  message_guid: string;
};

export const isMetaboostMbrssV1CreateBoostResponse = (
  value: unknown
): value is MetaboostMbrssV1CreateBoostResponse => {
  if (!isObjectLike(value)) {
    return false;
  }
  const messageGuid = getOwnPropertyValue(value, 'message_guid');
  return typeof messageGuid === 'string' && messageGuid.length > 0;
};
