import type { BoostAction } from '@podverse/helpers';

export const BLIP10_TLV_RECORD_KEY = '7629169';

export type Blip10Action = BoostAction | 'auto';

export type Blip10Metadata = {
  guid?: string;
  podcast?: string;
  feedID?: number;
  url?: string;
  episode?: string;
  episode_guid?: string;
  action: Blip10Action;
  ts?: number;
  time?: string;
  app_name?: string;
  app_version?: string;
  sender_id?: string;
  sender_name?: string;
  message?: string;
  value_msat_total?: number;
  value_msat?: number;
  name?: string;
};

export type BuildBlip10MetadataParams = {
  action: Blip10Action;
  value_msat_total?: number;
  value_msat?: number;
  app_name?: string;
  app_version?: string;
  sender_id?: string;
  sender_name?: string;
  message?: string;
  guid?: string;
  podcast?: string;
  feedID?: number;
  url?: string;
  episode?: string;
  episode_guid?: string;
  ts?: number;
  time?: string;
  name?: string;
};

export const buildBlip10Metadata = (params: BuildBlip10MetadataParams): Blip10Metadata => {
  const metadata: Blip10Metadata = {
    action: params.action,
  };

  if (params.value_msat_total !== undefined) {
    metadata.value_msat_total = params.value_msat_total;
  }
  if (params.value_msat !== undefined) {
    metadata.value_msat = params.value_msat;
  }
  if (params.app_name) {
    metadata.app_name = params.app_name;
  }
  if (params.app_version) {
    metadata.app_version = params.app_version;
  }
  if (params.sender_id) {
    metadata.sender_id = params.sender_id;
  }
  if (params.sender_name) {
    metadata.sender_name = params.sender_name;
  }
  if (params.message) {
    metadata.message = params.message;
  }
  if (params.guid) {
    metadata.guid = params.guid;
  }
  if (params.podcast) {
    metadata.podcast = params.podcast;
  }
  if (params.feedID !== undefined) {
    metadata.feedID = params.feedID;
  }
  if (params.url) {
    metadata.url = params.url;
  }
  if (params.episode) {
    metadata.episode = params.episode;
  }
  if (params.episode_guid) {
    metadata.episode_guid = params.episode_guid;
  }
  if (params.ts !== undefined) {
    metadata.ts = params.ts;
  }
  if (params.time) {
    metadata.time = params.time;
  }
  if (params.name) {
    metadata.name = params.name;
  }

  return metadata;
};

export const serializeBlip10Metadata = (metadata: Blip10Metadata): string =>
  JSON.stringify(metadata);

export const buildBlipMessage = (
  desc: string | null,
  allowBlipFallback: boolean,
  rawMessage: string
): string | undefined => {
  if (desc) {
    return desc;
  }
  const trimmed = rawMessage.trim();
  if (allowBlipFallback && trimmed.length > 0) {
    return trimmed;
  }
  return undefined;
};

export const buildCustomRecords = (
  blipPayload: string | null,
  customKey?: string | null,
  customValue?: string | null
): Record<string, string> | undefined => {
  const records: Record<string, string> = {};
  if (blipPayload) {
    records[BLIP10_TLV_RECORD_KEY] = blipPayload;
  }
  if (customKey && customValue) {
    records[customKey] = customValue;
  }
  return Object.keys(records).length > 0 ? records : undefined;
};
