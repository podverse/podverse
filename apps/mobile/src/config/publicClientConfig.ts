import { useSyncExternalStore } from 'react';

import {
  PLAYLIST_TAG_MAX_PER_PLAYLIST,
  PLAYLIST_TAG_NAME_MAX_LENGTH,
} from '@podverse/helpers/playlistTag';
import type { PublicClientConfig } from '@podverse/helpers/publicClientConfig';
import { PUBLIC_CLIENT_CONFIG_TIMEOUT_MS } from '@podverse/helpers/publicClientConfig';

import type { AccountSignupMode } from './accountSignupModeEnv';
import { getMobileAccountSignupModeFromEnv, isAccountSignupMode } from './accountSignupModeEnv';
import { getMobileContactEmailFromEnv, isMobileContactMailbox } from './env';

/**
 * Playlist tag limits before a public client config arrives, and when that load fails.
 * The same object is what `usePlaylistTagLimits` returns in that state.
 */
const fallbackPlaylistLimits = {
  maxPerPlaylist: PLAYLIST_TAG_MAX_PER_PLAYLIST,
  nameMaxLength: PLAYLIST_TAG_NAME_MAX_LENGTH,
};

export type MobilePublicClientConfigEnv = {
  signupMode: AccountSignupMode;
  contactEmail: string;
};

/** Fields the phone overlays. Signup mode is a string so an unknown value can be rejected. */
export type MobilePublicClientConfigRemote = {
  instance: {
    brandName: string;
    contactEmail: string;
    signupMode: string;
  };
  playlistLimits: {
    maxPerPlaylist: number;
    nameMaxLength: number;
  };
};

export type AppliedMobilePublicClientConfig = {
  /** Trimmed brand, or `null` when the payload has none. */
  brandName: string | null;
  contactEmail: string;
  playlistLimits: {
    maxPerPlaylist: number;
    nameMaxLength: number;
  };
  signupMode: AccountSignupMode;
};

/**
 * Overlay of a public client config onto the build's signup mode and contact email.
 * `null` keeps `env` and the playlist-tag helper limits. An unknown signup mode or a contact
 * string that is not a mailbox keeps that env field. A blank brand is `null`.
 */
export const applyMobilePublicClientConfig = (
  remote: MobilePublicClientConfigRemote | null,
  env: MobilePublicClientConfigEnv
): AppliedMobilePublicClientConfig => {
  if (remote === null) {
    return {
      brandName: null,
      contactEmail: env.contactEmail,
      playlistLimits: fallbackPlaylistLimits,
      signupMode: env.signupMode,
    };
  }

  const trimmedBrand = remote.instance.brandName.trim();
  return {
    brandName: trimmedBrand.length > 0 ? trimmedBrand : null,
    contactEmail: isMobileContactMailbox(remote.instance.contactEmail)
      ? remote.instance.contactEmail.trim()
      : env.contactEmail,
    playlistLimits: {
      maxPerPlaylist: remote.playlistLimits.maxPerPlaylist,
      nameMaxLength: remote.playlistLimits.nameMaxLength,
    },
    signupMode: isAccountSignupMode(remote.instance.signupMode)
      ? remote.instance.signupMode
      : env.signupMode,
  };
};

type Listener = () => void;

let loadGeneration = 0;
let inFlight: Promise<PublicClientConfig | null> | null = null;
let snapshot: AppliedMobilePublicClientConfig | null = null;
const listeners = new Set<Listener>();

const emit = (): void => {
  listeners.forEach((listener) => {
    listener();
  });
};

const publish = (next: AppliedMobilePublicClientConfig | null): void => {
  snapshot = next;
  emit();
};

/**
 * `GET /config` for this process. The API client and Offline Mode pref load here so reading
 * the snapshot does not pull them into every config import.
 */
const requestPublicClientConfig = async (): Promise<PublicClientConfig | null> => {
  const { isOfflineModeEnabled } = await import('../prefs/offlineMode');
  if (isOfflineModeEnabled()) {
    return null;
  }

  const { createMobileApiRequestService } = await import('../auth/mobileApi');
  const service = createMobileApiRequestService();
  if (service === null) {
    return null;
  }

  const response = await service.reqPublicClientConfigGet({
    controller: new AbortController(),
    timeoutMs: PUBLIC_CLIENT_CONFIG_TIMEOUT_MS,
  });
  return response.data;
};

const loadOnce = async (generation: number): Promise<PublicClientConfig | null> => {
  try {
    const remote = await requestPublicClientConfig();
    if (generation !== loadGeneration || remote === null) {
      return null;
    }
    publish(
      applyMobilePublicClientConfig(remote, {
        signupMode: getMobileAccountSignupModeFromEnv(),
        contactEmail: getMobileContactEmailFromEnv(),
      })
    );
    return remote;
  } catch {
    return null;
  }
};

/**
 * Shared load of `GET /config`. Returns the inner config, or `null` when Offline Mode is on,
 * the API client is missing, or the request fails. Callers share one promise. A failure stays
 * `null` until `clearPublicClientConfig`.
 */
export const loadPublicClientConfig = (): Promise<PublicClientConfig | null> => {
  if (inFlight === null) {
    inFlight = loadOnce(loadGeneration);
  }
  return inFlight;
};

/** Drops the loaded public client config so the next load reads the current server. */
export const clearPublicClientConfig = (): void => {
  loadGeneration += 1;
  inFlight = null;
  if (snapshot !== null) {
    publish(null);
  }
};

export const getPublicClientConfigSnapshot = (): AppliedMobilePublicClientConfig | null => {
  return snapshot;
};

const subscribePublicClientConfig = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** The applied public client config, or `null` before a successful load and after a clear. */
export function usePublicClientConfig(): AppliedMobilePublicClientConfig | null {
  return useSyncExternalStore(
    subscribePublicClientConfig,
    getPublicClientConfigSnapshot,
    getPublicClientConfigSnapshot
  );
}

/** Playlist tag limits from the public client config, or the helper defaults. */
export function usePlaylistTagLimits(): {
  maxPerPlaylist: number;
  nameMaxLength: number;
} {
  const current = usePublicClientConfig();
  if (current === null) {
    return fallbackPlaylistLimits;
  }
  return current.playlistLimits;
}
