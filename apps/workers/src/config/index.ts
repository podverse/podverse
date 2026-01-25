/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup in lib/startup/validation.ts */

type Config = {
  userAgent: string;
  log: {
    level: string;
    dir: string;
    timer: boolean;
  };
  podcastIndex: {
    authKey: string;
    baseUrl: string;
    secretKey: string;
  };
  queue: {
    protocol: string;
    host: string;
    username: string;
    password: string;
    port: number;
  };
};

export const config: Config = {
  userAgent: process.env.USER_AGENT!,
  log: {
    level: process.env.LOG_LEVEL!,
    dir: process.env.LOG_DIR!,
    timer: process.env.LOG_TIMER === 'true',
  },
  podcastIndex: {
    authKey: process.env.PODCAST_INDEX_AUTH_KEY!,
    baseUrl: process.env.PODCAST_INDEX_BASE_URL!,
    secretKey: process.env.PODCAST_INDEX_SECRET_KEY!,
  },
  queue: {
    protocol: process.env.MESSAGE_QUEUE_PROTOCOL!,
    host: process.env.MESSAGE_QUEUE_HOST!,
    username: process.env.MESSAGE_QUEUE_USERNAME!,
    password: process.env.MESSAGE_QUEUE_PASSWORD!,
    port: Number(process.env.MESSAGE_QUEUE_PORT!),
  },
};
