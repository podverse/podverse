import type { ActiveMQArtemisService, MQQueueName } from '@queue/services/activeMQArtemis/index.js';
import WebSocket from 'ws';

import { MQ_QUEUES } from '@podverse/helpers';
import type { Feed } from '@podverse/orm';
import { FeedService } from '@podverse/orm';

import { mqRSSAdd } from './add.js';

export const mqRSSRunLiveItemListener = (activeMQArtemisService: ActiveMQArtemisService) => {
  console.warn('starting runLiveItemListener v2');

  const feedService = new FeedService();

  /*
    Run an interval to keep the node script running forever.
  */
  setInterval(() => {
    console.warn('runLiveItemListener interval');
  }, 100000000);

  let openedSocket: boolean | null = null;
  const timeInterval = 5000;
  const url = 'wss://api.livewire.io/ws/podping';

  let connectionIdCount = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const hiveBlocksHandled: any = {};

  function connect() {
    const client = new WebSocket(url);
    return new Promise((resolve, reject) => {
      console.warn('client try to connect...');

      let connectionId = connectionIdCount;

      client.on('open', () => {
        connectionId = connectionIdCount + 1;
        connectionIdCount++;
        console.warn(
          `WEBSOCKET_OPEN: client connected to server at ${url}, connectionId: ${connectionId}`
        );
        openedSocket = true;
        resolve(openedSocket);
      });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      client.on('message', async function message(data: any) {
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
                      } else {
                        console.warn('feed url not found');
                      }
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

      client.on('close', (err) => {
        console.warn(`WEBSOCKET_CLOSE: connection closed ${err}, connectionId: ${connectionId}`);
        openedSocket = false;
        reject(err);
      });

      client.on('error', (err) => {
        console.warn(
          `WEBSOCKET_ERROR: Error ${new Error(err.message)}, connectionId: ${connectionId}`
        );
        openedSocket = false;
        reject(err);
      });
    });
  }

  async function reconnect() {
    try {
      await connect();
    } catch (err) {
      if (err instanceof Error) {
        console.error(`reconnect error: ${err.message}`);
      } else {
        console.error(`reconnect error: ${String(err)}`);
      }
    }
  }

  reconnect();

  // repeat every 5 seconds
  setInterval(() => {
    if (!openedSocket) {
      reconnect();
    }
  }, timeInterval);
};
