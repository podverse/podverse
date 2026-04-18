import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';

import { MBRSS_V1_AMOUNT_UNIT_SATOSHIS, MBRSS_V1_CURRENCY_BTC } from './mbrssV1CreateBoost.js';

/** Aligns with MetaBoost mb-v1 ingest (no RSS identity fields). */
export type MbV1CreateBoostClientPayload = {
  currency: typeof MBRSS_V1_CURRENCY_BTC;
  amount: number;
  amount_unit: typeof MBRSS_V1_AMOUNT_UNIT_SATOSHIS;
  action: 'boost' | 'stream';
  app_name: string;
  app_version?: string;
  sender_name?: string;
  message?: string | null;
};

export type MbV1CreateBoostIngestBody = MbV1CreateBoostClientPayload & {
  sender_guid: string;
};

export type BuildMbV1CreateBoostRequestParams = {
  totalMsat: number;
  appName: string;
  action: 'boost' | 'stream';
  message: string;
  yourName: string;
  appVersion?: string;
};

export const buildMbV1CreateBoostRequest = (
  params: BuildMbV1CreateBoostRequestParams
): MbV1CreateBoostClientPayload => {
  const amountSat = params.totalMsat / 1000;
  if (!(amountSat > 0)) {
    throw new Error('mb-v1 boost amount must be positive');
  }

  const body: MbV1CreateBoostClientPayload = {
    currency: MBRSS_V1_CURRENCY_BTC,
    amount: amountSat,
    amount_unit: MBRSS_V1_AMOUNT_UNIT_SATOSHIS,
    action: params.action,
    app_name: params.appName,
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

  return body;
};

export type MetaboostMbV1CreateBoostResponse = {
  message_guid: string;
};

export const isMetaboostMbV1CreateBoostResponse = (
  value: unknown
): value is MetaboostMbV1CreateBoostResponse => {
  if (!isObjectLike(value)) {
    return false;
  }
  const messageGuid = getOwnPropertyValue(value, 'message_guid');
  return typeof messageGuid === 'string' && messageGuid.length > 0;
};
