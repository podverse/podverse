import rhea from 'rhea';
import { Connection, Sender, Receiver, EventContext } from 'rhea';
import { ILoggerLike, getContainerIpPart } from '@podverse/helpers-backend';
import crypto from 'crypto';
import type { ParseRSSFeedAndSaveToDatabaseOptions } from '@podverse/parser';

export type MQQueueName =
  | 'rss-normal'
  | 'rss-on-demand'
  | 'rss-live'
  | `DLQ.${'rss-normal' | 'rss-on-demand' | 'rss-live'}`;

type MQRSSMessage = {
  url: string;
  podcast_index_id: number | null;
  options: ParseRSSFeedAndSaveToDatabaseOptions;
};

type Message = MQRSSMessage;

type SendMessageParams = {
  queueName: MQQueueName;
  message: Message;
  priority: 'normal' | 'slow';
  dedupeCacheTimeMS: number | null;
};

export interface ActiveMQArtemisServiceParams {
  // Keeping same name for external compatibility
  protocol: string;
  host: string;
  username: string;
  password: string;
  port: number;
}

export class ActiveMQArtemisService {
  // Name preserved
  private connection: Connection | null = null;
  private senders: Map<MQQueueName, Sender> = new Map();
  private receivers: Map<MQQueueName, Receiver> = new Map();
  private params: ActiveMQArtemisServiceParams;
  private logger: ILoggerLike;
  private connecting = false;
  private isShuttingDown = false;
  private readonly tcpKeepAliveMs: number = 30000;
  private readonly idleTimeOutMs: number = 60000;
  private keepAliveApplied = false;
  private readonly enableAmqpPing: boolean = process.env.ARTEMIS_DISABLE_AMQP_PING !== '1';
  private heartbeatSender: Sender | null = null;
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor(params: ActiveMQArtemisServiceParams, logger: ILoggerLike) {
    this.params = params;
    this.logger = logger;
  }

  async initialize() {
    // Queues are assumed to be pre-created externally (e.g. via provisioning script or broker config).
    try {
      await this.connect();
    } catch (error) {
      this.logger.logError('Failed to initialize Artemis connection', error as Error);
    }
  }

  private async connect() {
    if (this.connection || this.connecting) {
      return;
    }
    this.connecting = true;
    return new Promise<void>((resolve, reject) => {
      // Debug info about imported rhea module
      try {
        interface RheaConnectOptions {
          host: string;
          port: number;
          username?: string;
          password?: string;
          reconnect?: boolean;
          reconnect_limit?: number;
          [k: string]: unknown;
        }
        interface RheaLike {
          connect?: (options: RheaConnectOptions) => Connection;
          [k: string]: unknown;
        }
        const rheaLike: RheaLike = rhea as unknown as RheaLike;
        // Log a minimal snapshot of the rhea import for troubleshooting
        if (typeof rheaLike.connect !== 'function') {
          const err = new TypeError(
            'rhea.connect is not a function – possible ESM/CJS import mismatch'
          );
          this.logger.logError('Artemis connect failed early', err);
          this.connecting = false; // allow retry attempts later
          return reject(err);
        }
        const idleTimeOut = this.idleTimeOutMs;
        const baseId =
          process.env.CONTAINER_ID ||
          process.env.HOSTNAME ||
          `podverse-mq-${crypto.randomBytes(4).toString('hex')}`;
        const containerId = `${baseId}${getContainerIpPart()}`;

        const connection = rheaLike.connect({
          host: this.params.host,
          port: this.params.port,
          username: this.params.username,
          password: this.params.password,
          // send AMQP heartbeats so broker (default 60s TTL) sees activity and stays alive until manually closed
          idle_time_out: idleTimeOut,
          container_id: containerId,
          properties: { product: 'podverse-mq' },
          reconnect: true,
          reconnect_limit: -1,
        }) as Connection;

        connection.on('connection_open', (context?: EventContext) => {
          this.logger.info('Artemis AMQP connection established');
          try {
            // Log negotiated connection properties to help debug heartbeat/idle settings
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const connAny = context && (context.connection as any);
            const local = connAny && connAny.options ? connAny.options : undefined;
            const remote = connAny && connAny.remote ? connAny.remote : undefined;
            this.logger.info('Artemis connection negotiation', { local, remote });
          } catch (err) {
            this.logger.logError('Failed to log negotiated connection properties', err as Error);
          }
          this.connection = connection;
          this.connecting = false;

          // Best-effort: enable Node TCP keepalive on the underlying socket so
          // the OS detects dead peers even if AMQP-level heartbeats are missed.
          try {
            // rhea internal socket location varies between versions; probe common places.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const connAny = connection as unknown as Record<string, any>;
            const sock =
              connAny.socket ||
              connAny._socket ||
              (connAny.transport && (connAny.transport.socket || connAny.transport._socket));
            if (sock && typeof sock.setKeepAlive === 'function') {
              if (!this.keepAliveApplied) {
                sock.setKeepAlive(true, this.tcpKeepAliveMs);
                this.keepAliveApplied = true;
                this.logger.info(
                  `Enabled TCP keepalive on Artemis socket (${this.tcpKeepAliveMs}ms)`
                );
              } else {
                this.logger.info('TCP keepalive already applied to Artemis socket');
              }
              // Start optional AMQP-level pings if enabled
              if (this.enableAmqpPing) {
                try {
                  const hbSender = connection.open_sender({
                    target: { address: 'podverse.keepalive' },
                  });
                  hbSender.on('sender_open', () => {
                    this.heartbeatSender = hbSender;
                    if (this.heartbeatInterval) {
                      clearInterval(this.heartbeatInterval);
                    }
                    const heartbeatMs = Number(
                      process.env.ARTEMIS_AMQP_PING_MS ??
                        Math.max(1000, Math.floor(this.idleTimeOutMs / 2))
                    );
                    this.heartbeatInterval = setInterval(() => {
                      try {
                        if (this.heartbeatSender) {
                          this.heartbeatSender.send({ body: `ping:${Date.now()}` });
                        }
                      } catch (err) {
                        this.logger.logError('AMQP keepalive ping failed', err as Error);
                      }
                    }, heartbeatMs);
                  });
                  hbSender.on('sender_error', (ctx) => {
                    this.logger.logError(
                      'AMQP heartbeat sender_error',
                      (ctx && (ctx.error || ctx)) as Error
                    );
                  });
                  hbSender.on('sender_close', () => {
                    if (this.heartbeatInterval) {
                      clearInterval(this.heartbeatInterval);
                      this.heartbeatInterval = null;
                    }
                    this.heartbeatSender = null;
                  });
                } catch (err) {
                  this.logger.logError(
                    'Failed to start optional AMQP heartbeat sender',
                    err as Error
                  );
                }
              }
            } else {
              this.logger.info(
                'Could not find underlying socket to enable TCP keepalive (non-fatal)'
              );
            }
          } catch (err) {
            this.logger.logError('Failed to enable TCP keepalive on Artemis socket', err as Error);
          }

          resolve();
        });

        connection.on('connection_error', (context: EventContext) => {
          this.logger.logError('Artemis connection error', context.error as Error);
        });

        connection.on('disconnected', (context?: EventContext) => {
          // Provide the disconnect reason if available — this helps determine whether
          // the broker closed the AMQP link due to AMQP-level idle timeout or network issues.
          try {
            const reason =
              (context &&
                (context.error ||
                  (context as EventContext & { disconnect_reason?: unknown }).disconnect_reason)) ||
              undefined;
            this.logger.info('Artemis connection disconnected – will attempt reconnect', {
              reason,
            });
          } catch {
            this.logger.info('Artemis connection disconnected – will attempt reconnect');
          }
          this.connection = null;
          // keepAliveApplied resets so it can be re-applied on next open
          this.keepAliveApplied = false;
          if (this.enableAmqpPing) {
            if (this.heartbeatInterval) {
              clearInterval(this.heartbeatInterval);
              this.heartbeatInterval = null;
            }
            try {
              if (this.heartbeatSender) {
                try {
                  this.heartbeatSender.close();
                } catch {
                  // swallow
                }
                this.heartbeatSender = null;
              }
            } catch (err) {
              this.logger.logError('Error closing heartbeatSender on disconnect', err as Error);
            }
          }
        });
      } catch (err) {
        this.logger.logError('Artemis connect threw synchronously', err as Error);
        this.connecting = false; // reset so future retries can occur
        reject(err as Error);
      }
    });
  }

  private async ensureSender(queueName: MQQueueName): Promise<Sender> {
    const existingSender = this.senders.get(queueName);
    if (existingSender) {
      return existingSender;
    }
    if (!this.connection) {
      await this.connect();
    }
    if (!this.connection) {
      throw new Error('Connection not established');
    }
    const sender = this.connection.open_sender({ target: { address: queueName } });
    return new Promise((resolve) => {
      sender.on('sender_open', () => {
        this.logger.info(`Sender ready for queue ${queueName}`);
        this.senders.set(queueName, sender);
        resolve(sender);
      });
    });
  }

  private async ensureReceiver(queueName: MQQueueName): Promise<Receiver> {
    const existingReceiver = this.receivers.get(queueName);
    if (existingReceiver) {
      return existingReceiver;
    }
    if (!this.connection) {
      await this.connect();
    }
    if (!this.connection) {
      throw new Error('Connection not established');
    }
    const receiver = this.connection.open_receiver({
      source: { address: queueName },
      credit_window: 0,
    });
    return new Promise((resolve) => {
      receiver.on('receiver_open', () => {
        this.logger.info(`Receiver ready for queue ${queueName}`);
        this.receivers.set(queueName, receiver);
        receiver.add_credit(1);
        resolve(receiver);
      });
    });
  }

  private computeDuplicateId(
    queueName: MQQueueName,
    message: Message,
    dedupeCacheTimeMS: number | null
  ): string | null {
    if (!dedupeCacheTimeMS || dedupeCacheTimeMS <= 0) {
      return null;
    }
    const baseHash = crypto
      .createHash('sha256')
      .update(JSON.stringify(message.podcast_index_id))
      .digest('hex');
    const now = Date.now();
    const bucketStart = Math.floor(now / dedupeCacheTimeMS) * dedupeCacheTimeMS;
    return `${queueName}:${bucketStart}:${baseHash}`;
  }

  async sendMessage(params: SendMessageParams): Promise<void> {
    const { queueName, message, priority, dedupeCacheTimeMS } = params;
    try {
      const sender = await this.ensureSender(queueName);
      const bodyString = JSON.stringify(message);
      const duplicateId = this.computeDuplicateId(queueName, message, dedupeCacheTimeMS);
      const priorityValue = !priority || priority === 'normal' ? 5 : 1;
      await new Promise<void>((resolve, reject) => {
        const delivery = sender.send({
          body: bodyString,
          durable: true,
          priority: priorityValue,
          content_type: 'application/json',
          ...(duplicateId ? { application_properties: { _AMQ_DUPL_ID: duplicateId } } : {}), // omit property when no dedupe
        });
        const onAccepted = (context: EventContext) => {
          if (context.delivery === delivery) {
            this.logger.info(`Message sent to queue ${queueName}: ${bodyString}`);
            sender.removeListener('accepted', onAccepted);
            sender.removeListener('rejected', onRejected);
            resolve();
          }
        };
        const onRejected = (context: EventContext) => {
          if (context.delivery === delivery) {
            this.logger.logError(`sendMessage: Rejected by broker ${queueName}: ${bodyString}`);
            sender.removeListener('accepted', onAccepted);
            sender.removeListener('rejected', onRejected);
            reject(new Error('Message rejected'));
          }
        };
        sender.on('accepted', onAccepted);
        sender.on('rejected', onRejected);
      });
    } catch (error) {
      this.logger.logError(
        `sendMessage: Error sending message to queue ${queueName}`,
        error as Error
      );
    }
  }

  /**
   * Send a sample message directly to the Dead Letter Address for the given queue.
   * Useful for debugging DLQ consumers without needing to trigger failures.
   * The DLQ queues are bound to addresses of the form `DLQ.<queueName>`.
   */
  async sendSampleToDLQ(
    queueName: MQQueueName,
    sample: Record<string, unknown>,
    failureDescription = 'Sample DLQ message for debugging'
  ): Promise<void> {
    try {
      if (!this.connection) {
        await this.connect();
      }

      // Choose target based on what exists in your broker
      const dlqTargets: MQQueueName[] = [`DLQ.${queueName}` as MQQueueName];

      for (const dlqQueue of dlqTargets) {
        if (!this.connection) {
          throw new Error('Connection not established');
        }
        const sender = this.connection.open_sender({ target: { address: dlqQueue } });
        await new Promise<void>((resolve) => sender.once('sender_open', () => resolve()));

        const payload = { ...sample };
        const bodyString = JSON.stringify(payload);
        const delivery = sender.send({
          body: bodyString,
          durable: true,
          content_type: 'application/json',
          application_properties: {
            _AMQ_DLQ_DELIVERY_FAILURE_CAUSE: failureDescription,
            'x-opt-delivery-failure-cause': failureDescription,
          },
        });

        await new Promise<void>((resolve, reject) => {
          const onAccepted = (context: EventContext) => {
            if (context.delivery === delivery) {
              this.logger.info(`DLQ sample sent to ${dlqQueue}`);
              cleanup();
              resolve();
            }
          };
          const onRejected = (context: EventContext) => {
            if (context.delivery === delivery) {
              const err = new Error(`DLQ sample send was rejected for ${dlqQueue}`);
              this.logger.logError('sendSampleToDLQ: rejected', err);
              cleanup();
              reject(err);
            }
          };
          const cleanup = () => {
            sender.removeListener('accepted', onAccepted);
            sender.removeListener('rejected', onRejected);
          };
          sender.on('accepted', onAccepted);
          sender.on('rejected', onRejected);
        });
      }
    } catch (error) {
      this.logger.logError('sendSampleToDLQ: Error sending sample to DLQ', error as Error);
    }
  }

  async consumeMessages(
    queueName: MQQueueName,
    processMessage: (context: EventContext, receiver: Receiver) => Promise<void> | void
  ) {
    try {
      const receiver = await this.ensureReceiver(queueName);

      receiver.on('message', async (context: EventContext) => {
        if (context.receiver !== receiver) {
          return;
        }
        try {
          // The processing function is now responsible for accepting/rejecting and adding credit.
          await processMessage(context, receiver);
        } catch (err) {
          const error = err as Error;
          this.logger.logError('Error processing message', error);
          // If the processor throws, reject the message as a fallback and add credit.
          context.delivery?.reject({
            condition: 'podverse:processing-error',
            description: error.message,
          });
          receiver.add_credit(1);
        }
      });

      this.logger.info(`Consumer is set up for queue ${queueName}`);
    } catch (error) {
      this.logger.logError('consumeMessages: Failed to set consumer', error as Error);
    }
  }

  getIsShuttingDown(): boolean {
    return this.isShuttingDown;
  }

  async close(): Promise<void> {
    if (this.isShuttingDown) {
      return;
    }
    this.isShuttingDown = true;
    this.logger.info('Closing ActiveMQ Artemis connection...');
    const closeTimeoutMs = 10000;

    const doClose = async () => {
      // Close all receivers first to stop accepting new messages
      for (const [queueName, receiver] of this.receivers.entries()) {
        try {
          receiver.close();
          this.logger.info(`Closed receiver for queue ${queueName}`);
        } catch (error) {
          this.logger.logError(`Error closing receiver for ${queueName}`, error as Error);
        }
      }
      this.receivers.clear();

      // Close all senders
      for (const [queueName, sender] of this.senders.entries()) {
        try {
          sender.close();
          this.logger.info(`Closed sender for queue ${queueName}`);
        } catch (error) {
          this.logger.logError(`Error closing sender for ${queueName}`, error as Error);
        }
      }
      this.senders.clear();

      // Close the connection
      if (this.connection) {
        try {
          // Prevent reconnect attempts while we're shutting down
          try {
            // Attempt to disable reconnect behavior before closing.
            // rhea doesn't provide a documented toggle here, so remove event listeners
            // and try to flip common internal flags if present to avoid immediate reconnects.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const connAny = this.connection as unknown as Record<string, any>;
            if (connAny) {
              if (typeof connAny.removeAllListeners === 'function') {
                connAny.removeAllListeners();
              }
              // some rhea versions expose internal options or flags we can defensively set
              if (connAny.options && typeof connAny.options.reconnect !== 'undefined') {
                try {
                  connAny.options.reconnect = false;
                } catch {
                  // swallow
                }
              }
              try {
                connAny.reconnect = false;
              } catch {
                // swallow
              }
            }
          } catch {
            // swallow - this is best-effort cleanup prior to close
          }

          this.connection.close();
          this.logger.info('Closed ActiveMQ Artemis connection');
        } catch (error) {
          this.logger.logError('Error closing connection', error as Error);
        }
        this.connection = null;
        // reset keepalive flag
        this.keepAliveApplied = false;
        if (this.enableAmqpPing) {
          if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
          }
          try {
            if (this.heartbeatSender) {
              try {
                this.heartbeatSender.close();
              } catch {
                // swallow
              }
              this.heartbeatSender = null;
            }
          } catch (err) {
            this.logger.logError('Error closing heartbeatSender on close', err as Error);
          }
        }
      }
    };

    // race close against a timeout to avoid hanging shutdown; create timer before starting close
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeoutPromise = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        this.logger.error(`ActiveMQ Artemis close() timed out after ${closeTimeoutMs}ms`);
        resolve();
      }, closeTimeoutMs);
    });

    try {
      await Promise.race([doClose(), timeoutPromise]);
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }
}
