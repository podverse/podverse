import { describe, expect, it } from 'vitest';

import type { Phase4Value, Phase4ValueRecipient } from '../../types/partytime.js';
import { compatItemValue } from './value.js';

const recipient: Phase4ValueRecipient = {
  type: 'node',
  address: 'addr@example.com',
  split: 100,
  fee: false,
};

function value(valueTimeSplits: Phase4Value['valueTimeSplits']): Phase4Value {
  return {
    type: 'lightning',
    method: 'keysend',
    recipients: [recipient],
    valueTimeSplits,
  };
}

describe('compatItemValue time splits', () => {
  it('drops a time split whose start cannot fit media_player_time and keeps its sibling', () => {
    const dto = compatItemValue(
      value([
        { type: 'recipients', startTime: 1e8, duration: 30, recipients: [recipient] },
        { type: 'recipients', startTime: 10, duration: 20, recipients: [recipient] },
      ])
    );

    expect(dto.item_value_time_splits).toEqual([
      {
        meta: {
          start_time: '10.00',
          duration: '20.00',
          remote_start_time: '0.00',
          remote_percentage: '100.00',
        },
        item_value_time_splits_recipients: [
          {
            type: 'node',
            address: 'addr@example.com',
            split: 100,
            name: null,
            custom_key: null,
            custom_value: null,
            fee: false,
          },
        ],
        item_value_time_splits_remote_item: null,
      },
    ]);
  });
});
