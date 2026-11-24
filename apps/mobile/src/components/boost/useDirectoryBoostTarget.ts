import { useEffect, useRef, useState } from 'react';

import type { DTOChannel, DTOItem } from '@podverse/helpers/dto';

import { requestWithMobileAuthRefresh, useAuth } from '../../auth';

export type DirectoryBoostTargetState = {
  channel: DTOChannel | null;
  item: DTOItem | null;
  ready: boolean;
};

type DirectoryBoostTargetInput = {
  channel: DTOChannel | null;
  enabled: boolean;
  item: DTOItem | null;
};

/**
 * Directory playback often carries a list channel, which omits value rows. This loads the
 * channel before the boost button can show. The button stays hidden when that load fails.
 * An item load does not hold the button: a failure keeps the playing item and lists the
 * channel recipients.
 */
export function useDirectoryBoostTarget({
  channel,
  enabled,
  item,
}: DirectoryBoostTargetInput): DirectoryBoostTargetState {
  const { accessToken, clearSession, refreshToken, setTokens } = useAuth();
  const channelIdText = enabled && channel !== null ? channel.id_text : null;
  const channelValuesReady = channel !== null && Array.isArray(channel.channel_values);
  const itemIdText = item?.id_text ?? null;
  const itemValuesReady = item !== null && Array.isArray(item.item_values);
  const itemRef = useRef(item);
  itemRef.current = item;

  const [loadedChannel, setLoadedChannel] = useState<DTOChannel | null>(null);
  const [loadedItem, setLoadedItem] = useState<DTOItem | null>(null);

  useEffect(() => {
    if (channelIdText === null || channelValuesReady) {
      return;
    }
    let isCurrent = true;
    void requestWithMobileAuthRefresh(
      { accessToken, clearSession, refreshToken, setTokens },
      async (api) => api.reqChannelGetByIdOrIdText(channelIdText)
    )
      .then((body) => {
        if (!isCurrent || body.id_text !== channelIdText) {
          return;
        }
        setLoadedChannel(body);
      })
      .catch(() => {
        if (!isCurrent) {
          return;
        }
        setLoadedChannel((current) =>
          current !== null && current.id_text === channelIdText ? null : current
        );
      });
    return () => {
      isCurrent = false;
    };
  }, [accessToken, channelIdText, channelValuesReady, clearSession, refreshToken, setTokens]);

  useEffect(() => {
    if (channelIdText === null || itemIdText === null || itemValuesReady) {
      return;
    }
    const playbackItem = itemRef.current;
    if (playbackItem === null || playbackItem.id_text !== itemIdText) {
      return;
    }
    let isCurrent = true;
    void requestWithMobileAuthRefresh(
      { accessToken, clearSession, refreshToken, setTokens },
      async (api) => api.reqItemGetByIdOrIdText(itemIdText)
    )
      .then((body) => {
        if (!isCurrent || body.id_text !== itemIdText) {
          return;
        }
        setLoadedItem(body);
      })
      .catch(() => {
        if (!isCurrent) {
          return;
        }
        setLoadedItem({ ...playbackItem, item_values: [] });
      });
    return () => {
      isCurrent = false;
    };
  }, [
    accessToken,
    channelIdText,
    clearSession,
    itemIdText,
    itemValuesReady,
    refreshToken,
    setTokens,
  ]);

  if (channelIdText === null || channel === null) {
    return { channel: null, item: null, ready: false };
  }

  const resolvedChannel = channelValuesReady
    ? channel
    : loadedChannel !== null && loadedChannel.id_text === channelIdText
      ? loadedChannel
      : null;
  if (resolvedChannel === null) {
    return { channel: null, item: null, ready: false };
  }

  const resolvedItem =
    item === null
      ? null
      : itemValuesReady
        ? item
        : loadedItem !== null && loadedItem.id_text === item.id_text
          ? loadedItem
          : item;

  return { channel: resolvedChannel, item: resolvedItem, ready: true };
}
