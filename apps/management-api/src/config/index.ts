/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup in lib/startup/validation.ts */

import {
  DEFAULT_AUTH_JWT_EXPIRATION,
  DEFAULT_SET_PASSWORD_EXPIRATION,
  MS_PER_SECOND,
  readOptionalPositiveExpirationEnv,
} from '@podverse/helpers';

type Config = {
  nodeEnv: string;
  userAgent: string;
  brandName: string;
  log: {
    level: string;
  };
  auth: {
    jwtSecret: string;
    jwtExpiration: number;
    sessionCookieMaxAgeMs: number;
    allowTokenInResponseBody: boolean;
  };
  api: {
    port: number;
    prefix: string;
    version: string;
    release: string;
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
  appDatabase: {
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
  setUserPasswordExpiration: number;
};

export const config: Config = {
  nodeEnv: process.env.NODE_ENV!,
  userAgent: process.env.USER_AGENT!,
  brandName: process.env.BRAND_NAME!,
  log: {
    level: process.env.LOG_LEVEL!,
  },
  auth: (() => {
    const jwtExpiration = readOptionalPositiveExpirationEnv(
      'AUTH_JWT_EXPIRATION',
      DEFAULT_AUTH_JWT_EXPIRATION
    );
    return {
      jwtSecret: process.env.AUTH_JWT_SECRET!,
      jwtExpiration,
      sessionCookieMaxAgeMs: jwtExpiration * MS_PER_SECOND,
      allowTokenInResponseBody: process.env.AUTH_ALLOW_TOKEN_IN_RESPONSE_BODY === 'true',
    };
  })(),
  api: {
    port: parseInt(process.env.API_PORT!, 10),
    prefix: process.env.API_PREFIX!,
    version: process.env.API_VERSION!,
    release: process.env.API_RELEASE!,
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
    read_username: process.env.DB_MANAGEMENT_READ_USER!,
    read_password: process.env.DB_MANAGEMENT_READ_PASSWORD!,
    read_write_username: process.env.DB_MANAGEMENT_READ_WRITE_USER!,
    read_write_password: process.env.DB_MANAGEMENT_READ_WRITE_PASSWORD!,
    database: process.env.DB_MANAGEMENT_NAME!,
    ssl_connection: process.env.DB_SSL_CONNECTION === 'true',
  },
  appDatabase: {
    host: process.env.DB_HOST!,
    port: parseInt(process.env.DB_PORT!, 10),
    read_username: process.env.DB_APP_READ_USER!,
    read_password: process.env.DB_APP_READ_PASSWORD!,
    read_write_username: process.env.DB_APP_READ_WRITE_USER!,
    read_write_password: process.env.DB_APP_READ_WRITE_PASSWORD!,
    database: process.env.DB_APP_NAME!,
    ssl_connection: process.env.DB_SSL_CONNECTION === 'true',
  },
  web: {
    protocol: process.env.WEB_PROTOCOL!,
    domain: process.env.WEB_DOMAIN!,
  },
  setUserPasswordExpiration: readOptionalPositiveExpirationEnv(
    'MANAGEMENT_API_SET_PASSWORD_EXPIRATION',
    DEFAULT_SET_PASSWORD_EXPIRATION
  ),
};
