import type { ActiveMQArtemisService, MQQueueName } from '@queue/services/activeMQArtemis/index.js';
import WebSocket from 'ws';

import { LIVE_ITEM_POLL_INTERVAL_MS, MQ_QUEUES, ONE_HOUR_MS, ONE_MINUTE_MS } from '@podverse/helpers';
import type { Feed } from '@podverse/orm';
import { FeedService } from '@podverse/orm';

import { mqRSSAdd } from './add.js';

const HANDSHAKE_TIMEOUT_MS = 10_000;
/**
 * A socket that has not opened or sent a frame for this long is treated as dead, even if it
 * never emitted `close` or `error`.
 */
const STALE_SOCKET_MS = 5 * ONE_MINUTE_MS;
const HEARTBEAT_INTERVAL_MS = ONE_HOUR_MS;

export type LiveItemListenerHandle = {
  stop: () => void;
};

export const mqRSSRunLiveItemListener = (
  activeMQArtemisService: ActiveMQArtemisService
): LiveItemListenerHandle => {
  console.warn('starting runLiveItemListener v2');

  const feedService = new FeedService();

  let stopped = false;
  let socket: WebSocket | null = null;
  let connecting = false;
  let connectAttemptCount = 0;
  let currentConnectionId: number | null = null;
  /** Attempt start, open, or last frame on the current socket. The staleness window starts here. */
  let lastActivityAtMs: number | null = null;
  /** Last frame on any socket, for the heartbeat. */
  let lastFrameAtMs: number | null = null;

  const url = 'wss://api.livewire.io/ws/podping';

  let connectionIdCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hiveBlocksHandled: any = {};

  const heartbeatInterval = setInterval(() => {
    const lastFrame =
      lastFrameAtMs === null ? 'none' : `${Math.round((Date.now() - lastFrameAtMs) / 1000)}s ago`;
    const socketState = socket === null ? 'none' : connecting ? 'connecting' : 'open';
    console.warn(
      `runLiveItemListener heartbeat: last frame ${lastFrame}, socket ${socketState}, connect attempts ${connectAttemptCount}`
    );
  }, HEARTBEAT_INTERVAL_MS);

  /** Detaches a socket so none of its later events can touch the listener's state. */
  function discardSocket(client: WebSocket, mode: 'close' | 'terminate') {
    client.removeAllListeners();
    // ws can still emit an error while tearing down; with no listener that would throw.
    client.on('error', () => {});
    if (mode === 'terminate') {
      client.terminate();
    } else {
      client.close();
    }
  }

  function connect() {
    if (stopped || connecting || socket !== null) {
      return;
    }

    connectAttemptCount++;
    const attempt = connectAttemptCount;
    console.warn(`runLiveItemListener: connect attempt ${attempt} to ${url}`);

    connecting = true;
    let client: WebSocket;
    try {
      client = new WebSocket(url, { handshakeTimeout: HANDSHAKE_TIMEOUT_MS });
    } catch (err) {
      connecting = false;
      console.warn(`runLiveItemListener: connect attempt ${attempt} failed: ${String(err)}`);
      return;
    }
    socket = client;
    lastActivityAtMs = Date.now();

    const isCurrent = () => socket === client;
    let connectionId = connectionIdCount;

    const dropCurrent = () => {
      socket = null;
      connecting = false;
      currentConnectionId = null;
      lastActivityAtMs = null;
    };

    client.on('open', () => {
      if (!isCurrent()) {
        return;
      }
      connectionId = connectionIdCount + 1;
      connectionIdCount++;
      connecting = false;
      currentConnectionId = connectionId;
      lastActivityAtMs = Date.now();
      console.warn(
        `WEBSOCKET_OPEN: client connected to server at ${url}, connectionId: ${connectionId}, attempt: ${attempt}`
      );
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    client.on('message', async function message(data: any) {
      if (!isCurrent()) {
        return;
      }
      const receivedAtMs = Date.now();
      lastActivityAtMs = receivedAtMs;
      lastFrameAtMs = receivedAtMs;

      try {
        const msg = JSON.parse(data);

        // If the hiveBlock was already processed by our listener, then skip the message.
        if (hiveBlocksHandled[msg.n]) {
          return;
        }

        const prodPodpingLiveIdRegex = new RegExp('^pp_(.*)_(live|liveEnd)$', 'i');

        if (msg.t === 'podping') {
          hiveBlocksHandled[msg.n] = true;
          for (const p of msg.p) {
            if (
              prodPodpingLiveIdRegex.test(p.i) &&
              p.p.reason &&
              (p.p.reason.toLowerCase() === 'live' || p.p.reason.toLowerCase() === 'liveend')
            ) {
              console.warn(
                `p.p ${JSON.stringify(p.p)}, p.n Hive block number ${p.n}, connectionId: ${connectionId}`
              );
              const addRSSObjs: { url: string; podcast_index_id: number }[] = [];
              for (const url of p.p.iris) {
                try {
                  if (url?.startsWith('http')) {
                    let feed: Feed | null = null;
                    try {
                      feed = await feedService.getByUrl({ url });
                    } catch (error) {
                      console.warn(`p.p.iris error ${error}, connectionId: ${connectionId}`);
                    }
                    if (feed) {
                      const { podcast_index_id } = feed;
                      const numPodcastIndexId = Number(podcast_index_id);
                      if (podcast_index_id) {
                        addRSSObjs.push({ url, podcast_index_id: numPodcastIndexId });
                      }
                    }
                    // Feed not in our DB: expected for many Podping signals; ignore and do not log (see #106).
                  }
                } catch (err) {
                  console.warn(`p.p.iris error ${err}, connectionId: ${connectionId}`);
                }
              }
              const queueType: MQQueueName = 'rss-live';

              const mqConstantMessageOptions = MQ_QUEUES[queueType];

              for (const addRSSObj of addRSSObjs) {
                await mqRSSAdd(
                  activeMQArtemisService,
                  {
                    ...mqConstantMessageOptions,
                    feedUrl: addRSSObj.url,
                    podcast_index_id: addRSSObj.podcast_index_id,
                    closeAfterSend: false,
                  },
                  {
                    forceParse: true,
                    onDemandParserEvent: {
                      accountId: null,
                      remoteParentPodcastIndexId: null,
                      type: null,
                    },
                  }
                );
              }
            }
          }
        }
      } catch (err) {
        console.warn(`message error: ${err}, connectionId: ${connectionId}`);
      }
    });

    client.on('close', (code) => {
      if (!isCurrent()) {
        return;
      }
      console.warn(
        `WEBSOCKET_CLOSE: connection closed ${code}, connectionId: ${connectionId}, attempt: ${attempt}`
      );
      dropCurrent();
    });

    client.on('error', (err) => {
      if (!isCurrent()) {
        return;
      }
      console.warn(
        `WEBSOCKET_ERROR: Error ${new Error(err.message)}, connectionId: ${connectionId}, attempt: ${attempt}`
      );
      dropCurrent();
    });
  }

  function superviseConnection() {
    if (stopped) {
      return;
    }
    if (socket === null) {
      connect();
      return;
    }
    if (lastActivityAtMs === null) {
      return;
    }
    const silentMs = Date.now() - lastActivityAtMs;
    if (silentMs < STALE_SOCKET_MS) {
      return;
    }

    const state = connecting ? 'still connecting' : `connectionId: ${currentConnectionId}`;
    console.warn(
      `runLiveItemListener: no frame for ${Math.round(silentMs / 1000)}s (${state}), terminating and reconnecting`
    );
    const staleSocket = socket;
    socket = null;
    connecting = false;
    currentConnectionId = null;
    lastActivityAtMs = null;
    discardSocket(staleSocket, 'terminate');
    connect();
  }

  connect();

  const supervisorInterval = setInterval(superviseConnection, LIVE_ITEM_POLL_INTERVAL_MS);

  return {
    stop: () => {
      if (stopped) {
        return;
      }
      stopped = true;
      clearInterval(heartbeatInterval);
      clearInterval(supervisorInterval);
      connecting = false;
      if (socket !== null) {
        const closingSocket = socket;
        socket = null;
        discardSocket(closingSocket, 'close');
      }
    },
  };
};
