import { describe, expect, it } from 'vitest';

import { LiveItemStatusEnum } from '@podverse/helpers';

import { resolveRestoredLivestream } from '../restoredLivestream.js';

describe('resolveRestoredLivestream', () => {
  it('retires an ended status', () => {
    expect(
      resolveRestoredLivestream({ kind: 'status', statusId: LiveItemStatusEnum.Ended })
    ).toEqual({
      action: 'retire',
      reason: 'ended',
    });
  });

  it('keeps a live status', () => {
    expect(
      resolveRestoredLivestream({ kind: 'status', statusId: LiveItemStatusEnum.Live })
    ).toEqual({
      action: 'keep',
      reason: 'live',
    });
  });

  it('keeps a pending status', () => {
    expect(
      resolveRestoredLivestream({ kind: 'status', statusId: LiveItemStatusEnum.Pending })
    ).toEqual({
      action: 'keep',
      reason: 'pending',
    });
  });

  it('keeps a fresh item that is no longer a live item', () => {
    expect(resolveRestoredLivestream({ kind: 'status', statusId: null })).toEqual({
      action: 'keep',
      reason: 'not-live-item',
    });
  });

  it('retires a missing item', () => {
    expect(resolveRestoredLivestream({ kind: 'not-found' })).toEqual({
      action: 'retire',
      reason: 'not-found',
    });
  });

  it('keeps the item when the status read fails', () => {
    expect(resolveRestoredLivestream({ kind: 'unavailable' })).toEqual({
      action: 'keep',
      reason: 'status-unavailable',
    });
  });
});
