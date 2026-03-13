/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup in lib/startup/validation.ts */

import { getEffectiveUserAgent } from '@podverse/helpers';

type Config = {
  nodeEnv: string;
  userAgent: string;
  log: {
    level: string;
  };
  auth: {
    jwtSecret: string;
  };
  api: {
    port: number;
    prefix: string;
    version: string;
    cookie: {
      domain: string;
    };
    allowedCORSOrigins: string[];
  };
  database: {
    host: string;
    port: number;
    read_username: string;
    read_password: string;
    read_write_username: string;
    read_write_password: string;
    database: string;
    ssl_connection: boolean;
  };
  web: {
    protocol: string;
    domain: string;
  };
};

export const config: Config = {
  nodeEnv: process.env.NODE_ENV!,
  userAgent: getEffectiveUserAgent({
    userAgentRaw: process.env.USER_AGENT,
    brandName: process.env.BRAND_NAME!,
    suffix: ' Bot Local/Management-API/5',
  }),
  log: {
    level: process.env.LOG_LEVEL!,
  },
  auth: {
    jwtSecret: process.env.AUTH_JWT_SECRET!,
  },
  api: {
    port: parseInt(process.env.API_PORT!, 10),
    prefix: process.env.API_PREFIX!,
    version: process.env.API_VERSION!,
    cookie: {
      domain: process.env.COOKIE_DOMAIN!,
    },
    allowedCORSOrigins: process.env
      .API_ALLOWED_CORS_ORIGINS!.split(',')
      .map((origin) => origin.trim()),
  },
  database: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!, 10),
    read_username: process.env.DB_READ_USERNAME!,
    read_password: process.env.DB_READ_PASSWORD!,
    read_write_username: process.env.DB_READ_WRITE_USERNAME!,
    read_write_password: process.env.DB_READ_WRITE_PASSWORD!,
    database: process.env.DB_DATABASE!,
    ssl_connection: process.env.DB_SSL_CONNECTION === 'true',
  },
  web: {
    protocol: process.env.WEB_PROTOCOL!,
    domain: process.env.WEB_DOMAIN!,
  },
};
