export const CHANNEL_ACTION_CHROME_KEY = 'channel_action_chrome';

export type ChannelActionChrome = {
  channelId: number | null;
  isSubscribed: boolean;
  notificationsEnabled: boolean | null;
};

export type PersistedChannelActionChrome = {
  channelId: number | null;
  notificationsEnabled: boolean | null;
};

const EMPTY_CHROME: ChannelActionChrome = {
  channelId: null,
  isSubscribed: false,
  notificationsEnabled: null,
};

const memory = new Map<string, ChannelActionChrome>();

const readChrome = (idText: string): ChannelActionChrome => {
  return memory.get(idText) ?? { ...EMPTY_CHROME };
};

const writeChrome = (idText: string, next: ChannelActionChrome): void => {
  memory.set(idText, next);
};

export const getChannelActionChrome = (idText: string): ChannelActionChrome | null => {
  return memory.get(idText) ?? null;
};

/**
 * First-frame subscribe state: the navigate preview if the source already knew, otherwise the
 * device cache. Unknown is unsubscribed — never the opposite — so a cold deep link cannot flash
 * Unsubscribe on a show this device does not follow.
 */
export const resolveInitialSubscribed = (
  idText: string,
  previewIsSubscribed?: boolean
): boolean => {
  if (previewIsSubscribed !== undefined) {
    return previewIsSubscribed;
  }
  return getChannelActionChrome(idText)?.isSubscribed === true;
};

export const rememberChannelSubscribed = (idText: string, isSubscribed: boolean): void => {
  const current = readChrome(idText);
  writeChrome(idText, { ...current, isSubscribed });
};

export const rememberChannelIdentity = (idText: string, channelId: number): void => {
  const current = readChrome(idText);
  writeChrome(idText, { ...current, channelId });
};

export const rememberChannelNotifications = (idText: string, enabled: boolean): void => {
  const current = readChrome(idText);
  writeChrome(idText, { ...current, notificationsEnabled: enabled });
};

export const hydrateChannelActionChrome = (params: {
  persisted?: Readonly<Record<string, PersistedChannelActionChrome>>;
  subscribedIdTexts: readonly string[];
}): void => {
  memory.clear();
  const persisted = params.persisted ?? {};
  for (const [idText, entry] of Object.entries(persisted)) {
    writeChrome(idText, {
      channelId: entry.channelId,
      isSubscribed: false,
      notificationsEnabled: entry.notificationsEnabled,
    });
  }
  for (const idText of params.subscribedIdTexts) {
    const current = readChrome(idText);
    writeChrome(idText, { ...current, isSubscribed: true });
  }
};

export const snapshotPersistedChannelActionChrome = (): Record<
  string,
  PersistedChannelActionChrome
> => {
  const snapshot: Record<string, PersistedChannelActionChrome> = {};
  for (const [idText, chrome] of memory) {
    if (chrome.channelId === null && chrome.notificationsEnabled === null) {
      continue;
    }
    snapshot[idText] = {
      channelId: chrome.channelId,
      notificationsEnabled: chrome.notificationsEnabled,
    };
  }
  return snapshot;
};

export const parsePersistedChannelActionChrome = (
  value: unknown
): Record<string, PersistedChannelActionChrome> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }
  const snapshot: Record<string, PersistedChannelActionChrome> = {};
  for (const [idText, entry] of Object.entries(value)) {
    if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
      continue;
    }
    const record = entry;
    const channelIdValue = 'channelId' in record ? record.channelId : undefined;
    const notificationsValue =
      'notificationsEnabled' in record ? record.notificationsEnabled : undefined;
    snapshot[idText] = {
      channelId: typeof channelIdValue === 'number' ? channelIdValue : null,
      notificationsEnabled: typeof notificationsValue === 'boolean' ? notificationsValue : null,
    };
  }
  return snapshot;
};

/**
 * Bell state for the first frame of a channel screen.
 *
 * A numeric id — from the DTO or from a previous visit — plus the account rows is definitive.
 * Until that id is known, use the navigate preview or the device cache so the icon does not start
 * as "off" and then turn on.
 */
export const resolveChannelNotificationsEnabled = (params: {
  accountNotificationChannelIds: readonly number[] | undefined;
  cachedChannelId: number | null;
  cachedNotificationsEnabled: boolean | null;
  channelId: number | null;
  previewNotificationsEnabled?: boolean;
}): boolean => {
  const resolvedChannelId = params.channelId ?? params.cachedChannelId;
  if (resolvedChannelId !== null && params.accountNotificationChannelIds !== undefined) {
    return params.accountNotificationChannelIds.includes(resolvedChannelId);
  }
  if (params.previewNotificationsEnabled !== undefined) {
    return params.previewNotificationsEnabled;
  }
  return params.cachedNotificationsEnabled === true;
};

export const resetChannelActionChromeForTests = (): void => {
  memory.clear();
};
