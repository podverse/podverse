import { DATABASE_CONSTANTS, getMediumEnumValue } from '@podverse/helpers';
import { isValidHttpUrl } from '@podverse/helpers-validation';
import { resolveMetaBoostStandard } from '@podverse/v4v-metaboost';

import type {
  Phase4Value,
  Phase4ValueRecipient,
  PhasePendingMetaBoost,
} from '../../types/partytime.js';

export const compatChannelValue = (value: Phase4Value) => {
  return {
    type: value.type.slice(0, DATABASE_CONSTANTS.varchar_short),
    method: value.method.slice(0, DATABASE_CONSTANTS.varchar_short),
    suggested: parseFloat(value.suggested ?? '0') || null,
    meta_boost: null,
    channel_value_recipients: compatValueRecipients(value.recipients),
  };
};

/**
 * Build a channel value DTO with a specific method and filtered recipients.
 * Used when expanding one lightning value into lnaddress + keysend when both recipient types exist.
 */
export const compatChannelValueWithMethodAndRecipients = (
  value: Phase4Value,
  method: string,
  recipients: Phase4ValueRecipient[]
) => {
  return {
    type: value.type.slice(0, DATABASE_CONSTANTS.varchar_short),
    method: method.slice(0, DATABASE_CONSTANTS.varchar_short),
    suggested: parseFloat(value.suggested ?? '0') || null,
    meta_boost: null,
    channel_value_recipients: compatValueRecipients(recipients),
  };
};

export const compatItemValue = (value: Phase4Value) => {
  return {
    type: value.type.slice(0, DATABASE_CONSTANTS.varchar_short),
    method: value.method.slice(0, DATABASE_CONSTANTS.varchar_long),
    suggested: parseFloat(value.suggested ?? '0') || null,
    meta_boost: null,
    item_value_recipients: compatValueRecipients(value.recipients),
    item_value_time_splits: buildItemValueTimeSplits(value),
  };
};

/**
 * Build item value DTO with a specific method and filtered recipients.
 * Used when expanding one lightning item value into lnaddress + keysend when both recipient types exist.
 */
export const compatItemValueWithMethodAndRecipients = (
  value: Phase4Value,
  method: string,
  recipients: Phase4ValueRecipient[]
) => {
  return {
    type: value.type.slice(0, DATABASE_CONSTANTS.varchar_short),
    method: method.slice(0, DATABASE_CONSTANTS.varchar_long),
    suggested: parseFloat(value.suggested ?? '0') || null,
    meta_boost: null,
    item_value_recipients: compatValueRecipients(recipients),
    item_value_time_splits: buildItemValueTimeSplits(value),
  };
};

export const compatChannelMetaBoost = (metaBoost?: PhasePendingMetaBoost | null) => {
  const resolved = resolveMetaBoostStandard({
    standard: metaBoost?.standard ?? null,
    node: metaBoost?.node ?? null,
  });
  return resolved?.metaBoost ?? null;
};

const buildItemValueTimeSplits = (value: Phase4Value) =>
  value.valueTimeSplits
    ? value.valueTimeSplits.map((valueTimeSplit) => {
        if (valueTimeSplit.type === 'remoteItem') {
          return {
            meta: {
              start_time: DATABASE_CONSTANTS.getMediaPlayerNumeric(valueTimeSplit.startTime),
              duration: DATABASE_CONSTANTS.getMediaPlayerNumeric(valueTimeSplit.duration),
              remote_start_time:
                DATABASE_CONSTANTS.getMediaPlayerNumeric(valueTimeSplit.remoteStartTime ?? 0) ||
                (0).toFixed(2),
              remote_percentage:
                DATABASE_CONSTANTS.getMediaPlayerNumeric(valueTimeSplit.remotePercentage ?? 100) ||
                (100).toFixed(2),
            },
            item_value_time_splits_recipients: [],
            item_value_time_splits_remote_item: valueTimeSplit.remoteItem
              ? {
                  feed_guid: valueTimeSplit.remoteItem.feedGuid.slice(
                    0,
                    DATABASE_CONSTANTS.varchar_guid
                  ),
                  feed_url:
                    (isValidHttpUrl(valueTimeSplit.remoteItem.feedUrl) &&
                      valueTimeSplit.remoteItem.feedUrl?.slice(
                        0,
                        DATABASE_CONSTANTS.varchar_uri
                      )) ||
                    null,
                  item_guid:
                    valueTimeSplit.remoteItem.itemGuid?.slice(
                      0,
                      DATABASE_CONSTANTS.varchar_normal
                    ) ?? null,
                  title:
                    valueTimeSplit.remoteItem.title?.slice(0, DATABASE_CONSTANTS.varchar_normal) ??
                    null,
                  medium_id: valueTimeSplit.remoteItem.medium
                    ? getMediumEnumValue(valueTimeSplit.remoteItem.medium)
                    : null,
                }
              : null,
          };
        }
        return {
          meta: {
            start_time: DATABASE_CONSTANTS.getMediaPlayerNumeric(valueTimeSplit.startTime),
            duration: DATABASE_CONSTANTS.getMediaPlayerNumeric(valueTimeSplit.duration),
            remote_start_time: (0).toFixed(2),
            remote_percentage: (100).toFixed(2),
          },
          item_value_time_splits_recipients: compatValueRecipients(valueTimeSplit.recipients),
          item_value_time_splits_remote_item: null,
        };
      })
    : [];

const compatValueRecipients = (recipients: Phase4ValueRecipient[]) => {
  return (
    recipients.map((recipient) => {
      return {
        type: recipient.type.slice(0, DATABASE_CONSTANTS.varchar_short),
        address: recipient.address.slice(0, DATABASE_CONSTANTS.varchar_long),
        split: recipient.split,
        name: recipient.name?.slice(0, DATABASE_CONSTANTS.varchar_normal) || null,
        custom_key: recipient.customKey?.slice(0, DATABASE_CONSTANTS.varchar_long) || null,
        custom_value: recipient.customValue?.slice(0, DATABASE_CONSTANTS.varchar_long) || null,
        fee: recipient.fee || false,
      };
    }) || []
  );
};
