import type { AuthSessionEndedNotice } from '@podverse/helpers';
import { AUTH_SESSION_ENDED_NOTICES } from '@podverse/helpers';
import { parseAuthSessionEndedError } from '@podverse/helpers-requests';

const SESSION_ENDED_NOTICE_STORAGE_KEY = 'podverse.auth.session_ended_notice';

export type SessionEndedNoticeMessageKey =
  | 'session_ended.signed_out_elsewhere'
  | 'session_ended.password_changed'
  | 'session_ended.admin_force_logout'
  | 'session_ended.security';

function isAuthSessionEndedNotice(value: string): value is AuthSessionEndedNotice {
  return AUTH_SESSION_ENDED_NOTICES.some((notice) => notice === value);
}

/** Exhaustive: a new notice fails to compile until it has copy. Keys are under `authentication`. */
export function sessionEndedNoticeMessageKey(
  notice: AuthSessionEndedNotice
): SessionEndedNoticeMessageKey {
  switch (notice) {
    case 'signed_out_elsewhere':
      return 'session_ended.signed_out_elsewhere';
    case 'password_changed':
      return 'session_ended.password_changed';
    case 'admin_force_logout':
      return 'session_ended.admin_force_logout';
    case 'security':
      return 'session_ended.security';
  }
}

/** Saves the notice for the page load after the sign-out reload. Browser only. */
export function storePendingSessionEndedNotice(notice: AuthSessionEndedNotice): void {
  try {
    window.sessionStorage.setItem(SESSION_ENDED_NOTICE_STORAGE_KEY, notice);
  } catch {
    // sessionStorage can be disabled; a failure leaves no notice.
  }
}

let sessionEndedNoticeHeld = false;
const sessionEndedNoticeHoldListeners = new Set<() => void>();

function setSessionEndedNoticeHeld(held: boolean): void {
  if (sessionEndedNoticeHeld === held) {
    return;
  }
  sessionEndedNoticeHeld = held;
  for (const listener of sessionEndedNoticeHoldListeners) {
    listener();
  }
}

function peekPendingSessionEndedNotice(): boolean {
  try {
    const stored = window.sessionStorage.getItem(SESSION_ENDED_NOTICE_STORAGE_KEY);
    return stored !== null && isAuthSessionEndedNotice(stored);
  } catch {
    // sessionStorage can be disabled; a failure leaves no notice.
    return false;
  }
}

/**
 * True while a signed-out notice is saved for the next load or still on screen.
 * Settings keeps the current tab until this is false.
 */
export function sessionEndedNoticeHoldsPage(): boolean {
  return sessionEndedNoticeHeld || peekPendingSessionEndedNotice();
}

export function subscribeSessionEndedNoticeHold(listener: () => void): () => void {
  sessionEndedNoticeHoldListeners.add(listener);
  return () => {
    sessionEndedNoticeHoldListeners.delete(listener);
  };
}

/** The notice dialog closed, so a logged-out settings page may leave a restricted tab. */
export function releaseSessionEndedNoticeHold(): void {
  setSessionEndedNoticeHeld(false);
}

/** Returns the saved notice and removes it, so it shows once. Null when none or invalid. */
export function takePendingSessionEndedNotice(): AuthSessionEndedNotice | null {
  try {
    const stored = window.sessionStorage.getItem(SESSION_ENDED_NOTICE_STORAGE_KEY);
    window.sessionStorage.removeItem(SESSION_ENDED_NOTICE_STORAGE_KEY);
    if (stored !== null && isAuthSessionEndedNotice(stored)) {
      setSessionEndedNoticeHeld(true);
      return stored;
    }
    return null;
  } catch {
    // sessionStorage can be disabled; a failure leaves no notice.
    return null;
  }
}

export type SessionEndedHandler = (notice: AuthSessionEndedNotice) => Promise<void>;

let sessionEndedHandler: SessionEndedHandler | null = null;

/** Stays set for the life of the page, because every path reloads. */
let isHandlingSessionEnded = false;

/** The mounted app registers how to sign out; null restores the default (save notice, reload). */
export function setSessionEndedHandler(handler: SessionEndedHandler | null): void {
  sessionEndedHandler = handler;
}

async function defaultSessionEndedHandler(notice: AuthSessionEndedNotice): Promise<void> {
  storePendingSessionEndedNotice(notice);
  window.location.reload();
}

/**
 * Signs the page out with this notice. Acts once per page, shared with `reportSessionEndedError`.
 */
export function reportSessionEnded(notice: AuthSessionEndedNotice): void {
  if (typeof window === 'undefined' || isHandlingSessionEnded) {
    return;
  }
  isHandlingSessionEnded = true;
  void (sessionEndedHandler ?? defaultSessionEndedHandler)(notice);
}

/**
 * `onRequestError` for the browser's ApiRequestService. Acts once per page: the first refused
 * request with a signed-out notice signs the page out; later ones are ignored.
 */
export function reportSessionEndedError(error: unknown): void {
  const notice = parseAuthSessionEndedError(error);
  if (notice === null) {
    return;
  }
  reportSessionEnded(notice);
}
