/**
 * Playback rows written while signed out have no account.
 *
 * A promoted Add by RSS episode's position is stored under this pair, and item playback reads it
 * back when nobody is signed in.
 */
export const DEVICE_PLAYBACK_ACCOUNT_ID = 'device';

export const DEVICE_PLAYBACK_QUEUE_ID = 'local';
