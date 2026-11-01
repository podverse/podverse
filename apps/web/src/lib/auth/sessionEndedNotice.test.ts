import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { AuthSessionEndedNotice } from '@podverse/helpers';
import { AUTH_SESSION_ENDED_NOTICES } from '@podverse/helpers';

import {
  releaseSessionEndedNoticeHold,
  sessionEndedNoticeHoldsPage,
  sessionEndedNoticeMessageKey,
  storePendingSessionEndedNotice,
  subscribeSessionEndedNoticeHold,
  takePendingSessionEndedNotice,
} from './sessionEndedNotice';

const STORAGE_KEY = 'podverse.auth.session_ended_notice';

const MESSAGE_KEYS = {
  signed_out_elsewhere: 'session_ended.signed_out_elsewhere',
  password_changed: 'session_ended.password_changed',
  admin_force_logout: 'session_ended.admin_force_logout',
  security: 'session_ended.security',
} as const satisfies Record<AuthSessionEndedNotice, string>;

describe('sessionEndedNoticeMessageKey', () => {
  it('maps each notice to its authentication key', () => {
    for (const notice of AUTH_SESSION_ENDED_NOTICES) {
      expect(sessionEndedNoticeMessageKey(notice)).toBe(MESSAGE_KEYS[notice]);
    }
  });
});

describe('pending session ended notice', () => {
  afterEach(() => {
    releaseSessionEndedNoticeHold();
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it('returns the stored notice once', () => {
    for (const notice of AUTH_SESSION_ENDED_NOTICES) {
      storePendingSessionEndedNotice(notice);
      expect(takePendingSessionEndedNotice()).toBe(notice);
      expect(takePendingSessionEndedNotice()).toBeNull();
    }
  });

  it('returns null and removes an invalid stored value', () => {
    sessionStorage.setItem(STORAGE_KEY, 'not-a-notice');
    expect(takePendingSessionEndedNotice()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does not throw when sessionStorage.setItem throws', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('sessionStorage is disabled');
    });
    expect(() => storePendingSessionEndedNotice('security')).not.toThrow();
  });

  it('holds the page from the stored notice until the dialog is released', () => {
    const seen: boolean[] = [];
    const unsubscribe = subscribeSessionEndedNoticeHold(() => {
      seen.push(sessionEndedNoticeHoldsPage());
    });

    expect(sessionEndedNoticeHoldsPage()).toBe(false);
    storePendingSessionEndedNotice('signed_out_elsewhere');
    expect(sessionEndedNoticeHoldsPage()).toBe(true);

    expect(takePendingSessionEndedNotice()).toBe('signed_out_elsewhere');
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(sessionEndedNoticeHoldsPage()).toBe(true);
    expect(seen).toEqual([true]);

    releaseSessionEndedNoticeHold();
    expect(sessionEndedNoticeHoldsPage()).toBe(false);
    expect(seen).toEqual([true, false]);
    unsubscribe();
  });
});

function refused(notice: AuthSessionEndedNotice): unknown {
  return { response: { status: 401, data: { code: 'session_ended', notice } } };
}

function isReloadTarget(value: unknown): value is { reload: () => void } {
  if (typeof value !== 'object' || value === null || !('reload' in value)) {
    return false;
  }
  return typeof value.reload === 'function';
}

/**
 * jsdom marks `window.location` and its `reload` non-configurable, so the reload implementation
 * behind `window.location.reload` is replaced and restored.
 */
function installReloadMock(): { reload: ReturnType<typeof vi.fn>; restore: () => void } {
  let target: { reload: () => void } | undefined;
  for (const key of Object.getOwnPropertySymbols(window.location)) {
    const value: unknown = Reflect.get(window.location, key);
    if (isReloadTarget(value)) {
      target = value;
      break;
    }
  }
  if (target === undefined) {
    throw new Error('window.location.reload cannot be replaced');
  }
  const reloadTarget = target;
  const previous = Object.getOwnPropertyDescriptor(reloadTarget, 'reload');
  const reload = vi.fn();
  Object.defineProperty(reloadTarget, 'reload', {
    configurable: true,
    writable: true,
    value: reload,
  });
  return {
    reload,
    restore: () => {
      if (previous === undefined) {
        Reflect.deleteProperty(reloadTarget, 'reload');
      } else {
        Object.defineProperty(reloadTarget, 'reload', previous);
      }
    },
  };
}

describe('reportSessionEndedError', () => {
  let restoreReload: (() => void) | undefined;

  beforeEach(() => {
    vi.resetModules();
    sessionStorage.clear();
  });

  afterEach(() => {
    restoreReload?.();
    restoreReload = undefined;
    sessionStorage.clear();
  });

  it('calls the registered handler once for a signed-out notice', async () => {
    const { reportSessionEndedError, setSessionEndedHandler } =
      await import('./sessionEndedNotice');
    const handler = vi.fn(async () => {});
    setSessionEndedHandler(handler);

    reportSessionEndedError(refused('security'));
    reportSessionEndedError(refused('security'));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('security');
  });

  it('ignores a 401 without a notice and a 500', async () => {
    const { reportSessionEndedError, setSessionEndedHandler } =
      await import('./sessionEndedNotice');
    const handler = vi.fn(async () => {});
    setSessionEndedHandler(handler);

    reportSessionEndedError({ response: { status: 401, data: { message: 'Unauthorized' } } });
    reportSessionEndedError({
      response: { status: 500, data: { code: 'session_ended', notice: 'security' } },
    });
    expect(handler).not.toHaveBeenCalled();

    reportSessionEndedError(refused('security'));
    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('security');
  });

  it('lets a stream notice sign the page out once, ahead of a later refused request', async () => {
    const { reportSessionEnded, reportSessionEndedError, setSessionEndedHandler } =
      await import('./sessionEndedNotice');
    const handler = vi.fn(async () => {});
    setSessionEndedHandler(handler);

    reportSessionEnded('security');
    reportSessionEndedError(refused('password_changed'));

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('security');
  });

  it('lets a refused request sign the page out once, ahead of a later stream notice', async () => {
    const { reportSessionEnded, reportSessionEndedError, setSessionEndedHandler } =
      await import('./sessionEndedNotice');
    const handler = vi.fn(async () => {});
    setSessionEndedHandler(handler);

    reportSessionEndedError(refused('password_changed'));
    reportSessionEnded('security');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('password_changed');
  });

  it('stores the notice and reloads when no handler is registered', async () => {
    const installed = installReloadMock();
    restoreReload = installed.restore;
    const { reportSessionEndedError } = await import('./sessionEndedNotice');

    reportSessionEndedError(refused('security'));

    expect(sessionStorage.getItem(STORAGE_KEY)).toBe('security');
    expect(installed.reload).toHaveBeenCalledTimes(1);
  });
});
