import type { Phase4Value, Phase4ValueRecipient } from '../../types/partytime.js';
import { DATABASE_CONSTANTS } from '@podverse/helpers';
import { isValidHttpUrl } from '@podverse/helpers-validation';

export const compatChannelValue = (value: Phase4Value) => {
  return {
    type: value.type.slice(0, DATABASE_CONSTANTS.varchar_short),
    method: value.method.slice(0, DATABASE_CONSTANTS.varchar_short),
    suggested: parseFloat(value.suggested ?? '0') || null,
    channel_value_recipients: compatValueRecipients(value.recipients),
  };
};

export const compatItemValue = (value: Phase4Value) => {
  return {
    type: value.type.slice(0, DATABASE_CONSTANTS.varchar_short),
    method: value.method.slice(0, DATABASE_CONSTANTS.varchar_long),
    suggested: parseFloat(value.suggested ?? '0') || null,
    item_value_recipients: compatValueRecipients(value.recipients),
    item_value_time_splits:
      value.valueTimeSplits?.map((valueTimeSplit) => {
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
                    DATABASE_CONSTANTS.varchar_url
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
                    ) || null,
                  title: /* PTDO: ri.title || */ null,
                }
              : null,
          };
        } else {
          // else: valueTimeSplit.type === 'recipients'
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
        }
      }) || [],
  };
};

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
