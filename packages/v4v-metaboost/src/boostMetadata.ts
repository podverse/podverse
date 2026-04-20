import { getOwnPropertyValue, isObjectLike } from '@podverse/helpers';
import type { BoostAction } from '@podverse/helpers';

export type { BoostAction };

export type BoostMetadataRequest = {
  action: BoostAction;
  split: number;
  value_msat: number;
  value_msat_total: number;
  timestamp: string;
  group?: string;
  message?: string;
  app_name?: string;
  app_version?: string;
  sender_id?: string;
  sender_name?: string;
  recipient_name?: string;
  recipient_address?: string;
  value_usd?: number;
  position?: number;
  feed_guid?: string;
  feed_title?: string;
  item_guid?: string;
  item_title?: string;
  publisher_guid?: string;
  publisher_title?: string;
  remote_feed_guid?: string;
  remote_item_guid?: string;
  remote_publisher_guid?: string;
};

export type BoostMetadataResponse = {
  id: string;
  url: string;
  desc: string;
};

type BuildBoostMetadataParams = {
  action: BoostAction;
  split: number;
  value_msat: number;
  value_msat_total: number;
  message?: string;
  app_name?: string;
  app_version?: string;
  sender_id?: string;
  sender_name?: string;
  recipient_name?: string;
  recipient_address?: string;
  value_usd?: number;
  position?: number;
  feed_guid?: string;
  feed_title?: string;
  item_guid?: string;
  item_title?: string;
  publisher_guid?: string;
  publisher_title?: string;
  remote_feed_guid?: string;
  remote_item_guid?: string;
  remote_publisher_guid?: string;
};

export const buildBoostMetadataRequest = (
  params: BuildBoostMetadataParams
): BoostMetadataRequest => {
  const request: BoostMetadataRequest = {
    action: params.action,
    split: params.split,
    value_msat: params.value_msat,
    value_msat_total: params.value_msat_total,
    timestamp: new Date().toISOString(),
  };

  if (params.message !== undefined) {
    request.message = params.message;
  }
  if (params.app_name !== undefined) {
    request.app_name = params.app_name;
  }
  if (params.app_version !== undefined) {
    request.app_version = params.app_version;
  }
  if (params.sender_id !== undefined) {
    request.sender_id = params.sender_id;
  }
  if (params.sender_name !== undefined) {
    request.sender_name = params.sender_name;
  }
  if (params.recipient_name !== undefined) {
    request.recipient_name = params.recipient_name;
  }
  if (params.recipient_address !== undefined) {
    request.recipient_address = params.recipient_address;
  }
  if (params.value_usd !== undefined) {
    request.value_usd = params.value_usd;
  }
  if (params.position !== undefined) {
    request.position = params.position;
  }
  if (params.feed_guid !== undefined) {
    request.feed_guid = params.feed_guid;
  }
  if (params.feed_title !== undefined) {
    request.feed_title = params.feed_title;
  }
  if (params.item_guid !== undefined) {
    request.item_guid = params.item_guid;
  }
  if (params.item_title !== undefined) {
    request.item_title = params.item_title;
  }
  if (params.publisher_guid !== undefined) {
    request.publisher_guid = params.publisher_guid;
  }
  if (params.publisher_title !== undefined) {
    request.publisher_title = params.publisher_title;
  }
  if (params.remote_feed_guid !== undefined) {
    request.remote_feed_guid = params.remote_feed_guid;
  }
  if (params.remote_item_guid !== undefined) {
    request.remote_item_guid = params.remote_item_guid;
  }
  if (params.remote_publisher_guid !== undefined) {
    request.remote_publisher_guid = params.remote_publisher_guid;
  }

  return request;
};

export const isBoostMetadataResponse = (value: unknown): value is BoostMetadataResponse => {
  if (!isObjectLike(value)) {
    return false;
  }
  const id = getOwnPropertyValue(value, 'id');
  const url = getOwnPropertyValue(value, 'url');
  const desc = getOwnPropertyValue(value, 'desc');
  return typeof id === 'string' && typeof url === 'string' && typeof desc === 'string';
};
