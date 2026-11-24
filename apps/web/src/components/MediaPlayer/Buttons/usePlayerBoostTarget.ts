'use client';

import { useEffect, useRef, useState } from 'react';

import type { AddByRSSResourceData, DTOChannel, DTOItem } from '@podverse/helpers';
import type { AddByRSSResourceDataPayload } from '@podverse/parser-mapping';

import type { MediaPlayerAddByRSSState } from '../../../contexts/MediaPlayer';
import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { getApiRequestService } from '../../../factories/apiRequestService';
import { useRemotePlayerDisplay } from '../../../hooks/useRemotePlayerDisplay';
import { useRemotePlayerResource } from '../../../hooks/useRemotePlayerResource';
import type { RemotePlayerDisplay } from '../../../lib/crossDevicePlayback/remotePlayerDisplay';
import type { RemotePlayerResourceState } from '../../../lib/crossDevicePlayback/remotePlayerResourceStore';
import {
  getAddByRSSResourceDataFeedUrl,
  resolveAddByRSSIndexItemFromResourceData,
} from '../../../utils/addByRSS/playFromQueueResource';
import { getAddByRSSFeedByIdText, getAddByRSSFeedByUrl } from '../../../utils/addByRSS/storage';
import type { AddByRSSFeedRecord } from '../../../utils/addByRSS/types';
import type { PlayerBoostTarget } from './playerBoostTarget';
import {
  boostTargetFromAddByRss,
  boostTargetFromRecords,
  databaseChannelNeedsFetch,
  databaseItemNeedsFetch,
} from './playerBoostTarget';

type BoostResourceData = AddByRSSResourceData | AddByRSSResourceDataPayload;

type PlaybackSnapshot = {
  mpAddByRSS: MediaPlayerAddByRSSState;
  mpChannel: DTOChannel | null;
  mpItem: DTOItem | null;
  remote: RemotePlayerDisplay | null;
  remoteResource: RemotePlayerResourceState;
};

type SyncBoostTarget = { kind: 'sync'; target: PlayerBoostTarget | null } | { kind: 'async' };

const nonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === '' ? null : trimmed;
};

const playbackIdentity = ({
  mpAddByRSS,
  mpChannel,
  mpItem,
  remote,
  remoteResource,
}: PlaybackSnapshot): string =>
  [
    remote === null ? 'local' : 'remote',
    remoteResource.status,
    remoteResource.key ?? '',
    mpAddByRSS?.idText ?? '',
    mpChannel?.id_text ?? '',
    mpItem?.id_text ?? '',
  ].join('\n');

const synchronousBoostTarget = (snapshot: PlaybackSnapshot): SyncBoostTarget => {
  const { mpAddByRSS, mpChannel, mpItem, remote, remoteResource } = snapshot;

  if (remote !== null) {
    if (remoteResource.status !== 'ready') {
      return { kind: 'sync', target: null };
    }
    if (remoteResource.resource.kind === 'database') {
      return {
        kind: 'sync',
        target: boostTargetFromRecords(
          remoteResource.resource.channel,
          remoteResource.resource.item
        ),
      };
    }
    return { kind: 'async' };
  }

  if (mpAddByRSS !== null) {
    return { kind: 'async' };
  }

  if (mpChannel !== null) {
    if (!databaseChannelNeedsFetch(mpChannel) && !databaseItemNeedsFetch(mpItem)) {
      return { kind: 'sync', target: boostTargetFromRecords(mpChannel, mpItem) };
    }
    return { kind: 'async' };
  }

  return { kind: 'sync', target: null };
};

const resolveStoredFeed = async (
  resourceData: BoostResourceData
): Promise<AddByRSSFeedRecord | null> => {
  const feedUrl = getAddByRSSResourceDataFeedUrl(resourceData);
  if (feedUrl !== null) {
    const byUrl = await getAddByRSSFeedByUrl(feedUrl);
    if (byUrl !== null) {
      return byUrl;
    }
  }

  const channelIdText = nonEmptyString(resourceData['channel_id_text']);
  if (channelIdText === null) {
    return null;
  }
  return getAddByRSSFeedByIdText(channelIdText);
};

const resolveAddByRssTarget = async (
  resourceData: BoostResourceData
): Promise<PlayerBoostTarget | null> => {
  const feed = await resolveStoredFeed(resourceData);
  if (feed === null) {
    return null;
  }
  const resolved = await resolveAddByRSSIndexItemFromResourceData(resourceData);
  return boostTargetFromAddByRss(feed, resolved === null ? null : resolved.indexItem);
};

const resolveDatabaseTarget = async (
  channel: DTOChannel,
  item: DTOItem | null
): Promise<PlayerBoostTarget | null> => {
  let resolvedChannel = channel;
  if (databaseChannelNeedsFetch(channel)) {
    try {
      resolvedChannel = await getApiRequestService().reqChannelGetByIdOrIdText(channel.id_text);
    } catch {
      return null;
    }
  }

  let resolvedItem = item;
  if (item !== null && databaseItemNeedsFetch(item)) {
    try {
      resolvedItem = await getApiRequestService().reqItemGetByIdOrIdText(item.id_text);
    } catch {
      resolvedItem = item;
    }
  }

  return boostTargetFromRecords(resolvedChannel, resolvedItem);
};

const resolveSnapshot = async (snapshot: PlaybackSnapshot): Promise<PlayerBoostTarget | null> => {
  const { mpAddByRSS, mpChannel, mpItem, remote, remoteResource } = snapshot;

  if (remote !== null) {
    if (remoteResource.status !== 'ready') {
      return null;
    }
    if (remoteResource.resource.kind === 'database') {
      return boostTargetFromRecords(remoteResource.resource.channel, remoteResource.resource.item);
    }
    return resolveAddByRssTarget(remoteResource.resource.resourceData);
  }

  if (mpAddByRSS !== null) {
    return resolveAddByRssTarget(mpAddByRSS.resourceData);
  }

  if (mpChannel !== null) {
    return resolveDatabaseTarget(mpChannel, mpItem);
  }

  return null;
};

export const usePlayerBoostTarget = (): PlayerBoostTarget | null => {
  const { mpAddByRSS, mpChannel, mpItem } = useMediaPlayer();
  const remote = useRemotePlayerDisplay();
  const remoteResource = useRemotePlayerResource();
  const snapshot: PlaybackSnapshot = { mpAddByRSS, mpChannel, mpItem, remote, remoteResource };
  const sync = synchronousBoostTarget(snapshot);
  const identity = playbackIdentity(snapshot);
  const isSync = sync.kind === 'sync';

  const playbackRef = useRef(snapshot);
  playbackRef.current = snapshot;

  const generationRef = useRef(0);
  const [asyncResolved, setAsyncResolved] = useState<{
    identity: string;
    target: PlayerBoostTarget | null;
  } | null>(null);

  useEffect(() => {
    const generation = generationRef.current + 1;
    generationRef.current = generation;
    if (isSync) {
      return;
    }

    const started = playbackRef.current;
    void resolveSnapshot(started)
      .then((target) => {
        if (generationRef.current !== generation) {
          return;
        }
        setAsyncResolved({ identity, target });
      })
      .catch(() => {
        if (generationRef.current !== generation) {
          return;
        }
        setAsyncResolved({ identity, target: null });
      });

    return () => {
      generationRef.current += 1;
    };
  }, [identity, isSync]);

  if (sync.kind === 'sync') {
    return sync.target;
  }
  if (asyncResolved !== null && asyncResolved.identity === identity) {
    return asyncResolved.target;
  }
  return null;
};
