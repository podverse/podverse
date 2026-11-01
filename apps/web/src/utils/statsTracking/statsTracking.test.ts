import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { DTOAccount } from '@podverse/helpers';

import type { ListenSessionReport } from '../../lib/playback';
import {
  createClientListenId,
  reportListen,
  syncListenStatsGateFromAccount,
  syncTasteProfileAgreementVersion,
  trackStatsPlaylistOpen,
  trackStatsProfileOpen,
} from './statsTracking';

const AGREEMENT_VERSION = '2026-10-22';

const mocks = vi.hoisted(() => {
  const api = { name: 'api-request-service' };
  return {
    api,
    reqStatsListen: vi.fn(async () => ({ status: 201, data: { result: 'counted' } })),
    reqStatsOpen: vi.fn(async () => ({ status: 201, data: { result: 'counted' } })),
    getApiRequestService: vi.fn(() => api),
  };
});

vi.mock('@podverse/helpers-requests', () => ({
  reqStatsListen: mocks.reqStatsListen,
  reqStatsOpen: mocks.reqStatsOpen,
}));

vi.mock('../../factories/apiRequestService', () => ({
  getApiRequestService: mocks.getApiRequestService,
}));

const { api, reqStatsListen, reqStatsOpen } = mocks;

/** Fixture only fills the decision fields the gate reads. */
function accountWithDecision(accepted: boolean): DTOAccount {
  return {
    id: 7,
    id_text: 'viewer-7',
    verified: true,
    account_settings: {
      listen_stats_accepted: accepted,
      listen_stats_agreement_version: AGREEMENT_VERSION,
    },
  } as unknown as DTOAccount;
}

function allowReports(): void {
  syncTasteProfileAgreementVersion(AGREEMENT_VERSION);
  syncListenStatsGateFromAccount(accountWithDecision(true));
}

const itemReport: ListenSessionReport = {
  target: { kind: 'item', idText: 'item-1', mediumId: null },
  clientListenId: 'listen-item',
  secondsHeard: 61,
  completed: false,
  countedAtMs: 1,
  firstReport: true,
  mediaDurationSeconds: 2_400,
};

const clipReport: ListenSessionReport = {
  target: { kind: 'clip', idText: 'clip-1', startSeconds: 12, endSeconds: 40, mediumId: null },
  clientListenId: 'listen-clip',
  secondsHeard: 30,
  completed: true,
  countedAtMs: 2,
  firstReport: false,
  mediaDurationSeconds: null,
};

const V4_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

beforeEach(() => {
  syncListenStatsGateFromAccount(null);
  syncTasteProfileAgreementVersion('');
  reqStatsListen.mockClear();
  reqStatsOpen.mockClear();
  reqStatsListen.mockResolvedValue({ status: 201, data: { result: 'counted' } });
  reqStatsOpen.mockResolvedValue({ status: 201, data: { result: 'counted' } });
});

describe('createClientListenId', () => {
  it('matches the v4 uuid pattern and differs between calls', () => {
    const first = createClientListenId();
    const second = createClientListenId();

    expect(first).toMatch(V4_UUID);
    expect(second).toMatch(V4_UUID);
    expect(first).not.toBe(second);
  });
});

describe('reportListen', () => {
  it('sends nothing when no account is synced', () => {
    reportListen(itemReport);

    expect(reqStatsListen).not.toHaveBeenCalled();
  });

  it('sends nothing when the decision does not allow tracking', () => {
    syncTasteProfileAgreementVersion(AGREEMENT_VERSION);
    syncListenStatsGateFromAccount(accountWithDecision(false));

    reportListen(itemReport);

    expect(reqStatsListen).not.toHaveBeenCalled();
  });

  it('posts an item report without clip_id_text or listened_at', () => {
    allowReports();

    reportListen(itemReport);

    expect(reqStatsListen).toHaveBeenCalledTimes(1);
    expect(reqStatsListen).toHaveBeenCalledWith(api, {
      item_id_text: 'item-1',
      client_listen_id: 'listen-item',
      seconds_heard: 61,
      completed: false,
      media_duration_seconds: 2_400,
    });
  });

  it('posts a clip report without item_id_text or listened_at', () => {
    allowReports();

    reportListen(clipReport);

    expect(reqStatsListen).toHaveBeenCalledTimes(1);
    expect(reqStatsListen).toHaveBeenCalledWith(api, {
      clip_id_text: 'clip-1',
      client_listen_id: 'listen-clip',
      seconds_heard: 30,
      completed: true,
    });
    expect(reqStatsListen.mock.calls[0]?.[1]).not.toHaveProperty('media_duration_seconds');
  });

  it('does not leave a rejected listen request unhandled', async () => {
    allowReports();
    reqStatsListen.mockRejectedValueOnce(new Error('offline'));

    reportListen(itemReport);
    await new Promise((resolve) => {
      setTimeout(resolve, 0);
    });

    expect(reqStatsListen).toHaveBeenCalledTimes(1);
  });
});

describe('open reports', () => {
  it('skips a logged-out viewer and the viewer own profile', () => {
    allowReports();

    trackStatsProfileOpen(undefined, 9, 'viewed-9');
    trackStatsProfileOpen(null, 9, 'viewed-9');
    trackStatsProfileOpen(7, 7, 'viewer-7');

    expect(reqStatsOpen).not.toHaveBeenCalled();
  });

  it('posts a profile open and a playlist open when tracking is allowed', () => {
    allowReports();

    trackStatsProfileOpen(7, 9, 'viewed-9');
    trackStatsPlaylistOpen('playlist-1');

    expect(reqStatsOpen).toHaveBeenNthCalledWith(1, api, { account_id_text: 'viewed-9' });
    expect(reqStatsOpen).toHaveBeenNthCalledWith(2, api, { playlist_id_text: 'playlist-1' });
  });

  it('skips profile and playlist opens when the account declined', () => {
    syncTasteProfileAgreementVersion(AGREEMENT_VERSION);
    syncListenStatsGateFromAccount(accountWithDecision(false));

    trackStatsProfileOpen(7, 9, 'viewed-9');
    trackStatsPlaylistOpen('playlist-1');

    expect(reqStatsOpen).not.toHaveBeenCalled();
  });
});
