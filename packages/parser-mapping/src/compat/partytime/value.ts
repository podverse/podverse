import { DATABASE_CONSTANTS, getMediumEnumValue } from '@podverse/helpers';
import { isValidHttpUrl } from '@podverse/helpers-validation';

import type { Phase4Value, Phase4ValueRecipient } from '../../types/partytime.js';

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
    item_value_time_splits: buildItemValueTimeSplits(value),
  };
};

const buildItemValueTimeSplits = (value: Phase4Value) =>
  (value.valueTimeSplits ?? []).flatMap((valueTimeSplit) => {
    const start_time = DATABASE_CONSTANTS.mediaPlayerTimeOrNull(valueTimeSplit.startTime);
    const duration = DATABASE_CONSTANTS.mediaPlayerTimeOrNull(valueTimeSplit.duration);
    if (start_time === null || duration === null) {
      return [];
    }

    if (valueTimeSplit.type === 'remoteItem') {
      return [
        {
          meta: {
            start_time,
            duration,
            remote_start_time:
              DATABASE_CONSTANTS.mediaPlayerTimeOrNull(valueTimeSplit.remoteStartTime ?? 0) ??
              (0).toFixed(2),
            remote_percentage:
              DATABASE_CONSTANTS.mediaPlayerTimeOrNull(valueTimeSplit.remotePercentage ?? 100) ??
              (100).toFixed(2),
          },
          item_value_time_splits_recipients: compatValueRecipients([]),
          item_value_time_splits_remote_item: valueTimeSplit.remoteItem
            ? {
                feed_guid: valueTimeSplit.remoteItem.feedGuid.slice(
                  0,
                  DATABASE_CONSTANTS.varchar_guid
                ),
                feed_url:
                  (isValidHttpUrl(valueTimeSplit.remoteItem.feedUrl) &&
                    valueTimeSplit.remoteItem.feedUrl?.slice(0, DATABASE_CONSTANTS.varchar_uri)) ||
                  null,
                item_guid:
                  valueTimeSplit.remoteItem.itemGuid?.slice(0, DATABASE_CONSTANTS.varchar_normal) ??
                  null,
                title:
                  valueTimeSplit.remoteItem.title?.slice(0, DATABASE_CONSTANTS.varchar_normal) ??
                  null,
                medium_id: valueTimeSplit.remoteItem.medium
                  ? getMediumEnumValue(valueTimeSplit.remoteItem.medium)
                  : null,
              }
            : null,
        },
      ];
    }

    return [
      {
        meta: {
          start_time,
          duration,
          remote_start_time: (0).toFixed(2),
          remote_percentage: (100).toFixed(2),
        },
        item_value_time_splits_recipients: compatValueRecipients(valueTimeSplit.recipients),
        item_value_time_splits_remote_item: null,
      },
    ];
  });

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

const LIGHTNING_METHOD_ORDER = ['lnaddress', 'keysend'];

const isLightningValue = (value: Phase4Value): boolean => value.type.toLowerCase() === 'lightning';

const isLnaddressRecipient = (recipient: Phase4ValueRecipient): boolean =>
  recipient.type.toLowerCase() === 'lnaddress';

const clonePhase4Value = (
  value: Phase4Value,
  method: string = value.method,
  recipients: Phase4ValueRecipient[] = value.recipients ?? []
): Phase4Value => {
  const cloned: Phase4Value = {
    ...value,
    method,
    recipients: [...recipients],
  };
  if (value.valueTimeSplits !== undefined) {
    cloned.valueTimeSplits = [...value.valueTimeSplits];
  }
  return cloned;
};

// Lightning with both lnaddress and other recipients is stored as two rows. A recipient
// whose type is not lnaddress keeps its type. A lightning value with only those recipients
// keeps the feed method. Other value types are not split.
const splitPhase4Value = (value: Phase4Value): Phase4Value[] => {
  const recipients = value.recipients ?? [];
  if (!isLightningValue(value) || recipients.length === 0) {
    return [clonePhase4Value(value)];
  }

  const lnaddressRecipients = recipients.filter((recipient) => isLnaddressRecipient(recipient));
  const keysendRecipients = recipients.filter((recipient) => !isLnaddressRecipient(recipient));

  if (lnaddressRecipients.length > 0 && keysendRecipients.length > 0) {
    return [
      clonePhase4Value(value, 'lnaddress', lnaddressRecipients),
      clonePhase4Value(value, 'keysend', keysendRecipients),
    ];
  }

  if (lnaddressRecipients.length > 0) {
    return [clonePhase4Value(value, 'lnaddress', lnaddressRecipients)];
  }

  return [clonePhase4Value(value)];
};

const sameRecipientIdentity = (
  earlier: Phase4ValueRecipient,
  later: Phase4ValueRecipient
): boolean =>
  earlier.type === later.type &&
  earlier.address === later.address &&
  (earlier.customKey ?? null) === (later.customKey ?? null) &&
  (earlier.customValue ?? null) === (later.customValue ?? null);

// One stored row per type and method. A later block appends recipients and time splits.
// A recipient that matches an earlier type, address, custom key, and custom value keeps
// the earlier split.
const mergePhase4Values = (values: Phase4Value[]): Phase4Value[] => {
  const merged: Phase4Value[] = [];
  for (const value of values) {
    const existing = merged.find(
      (candidate) => candidate.type === value.type && candidate.method === value.method
    );
    if (existing === undefined) {
      merged.push(value);
      continue;
    }

    for (const recipient of value.recipients) {
      const alreadyStored = existing.recipients.some((earlier) =>
        sameRecipientIdentity(earlier, recipient)
      );
      if (!alreadyStored) {
        existing.recipients.push(recipient);
      }
    }

    if (value.valueTimeSplits !== undefined && value.valueTimeSplits.length > 0) {
      existing.valueTimeSplits = [...(existing.valueTimeSplits ?? []), ...value.valueTimeSplits];
    }
  }
  return merged;
};

export const expandPhase4Values = (values: Phase4Value[]): Phase4Value[] =>
  mergePhase4Values(values.flatMap((value) => splitPhase4Value(value)));

export const sortValueBlocksByMethod = <T>(
  blocks: T[],
  readTypeAndMethod: (block: T) => { type: string; method: string }
): T[] => {
  return [...blocks].sort((left, right) => {
    const leftValue = readTypeAndMethod(left);
    const rightValue = readTypeAndMethod(right);
    if (leftValue.type !== 'lightning' || rightValue.type !== 'lightning') {
      return 0;
    }
    const leftIndex = LIGHTNING_METHOD_ORDER.indexOf(leftValue.method);
    const rightIndex = LIGHTNING_METHOD_ORDER.indexOf(rightValue.method);
    if (leftIndex === -1 && rightIndex === -1) {
      return 0;
    }
    if (leftIndex === -1) {
      return 1;
    }
    if (rightIndex === -1) {
      return -1;
    }
    return leftIndex - rightIndex;
  });
};
