// reflect-metadata before any import that can load TypeORM entities
// eslint-disable-next-line simple-import-sort/imports
import 'reflect-metadata';

import { config } from '@mgmt-api/config/index.js';
import { initializePassport } from '@mgmt-api/lib/auth/index.js';
import { registerHealthRoutes } from '@mgmt-api/lib/health/registerHealthRoutes.js';
import { adminsRouter } from '@mgmt-api/routes/admins.js';
import { authRouter } from '@mgmt-api/routes/auth.js';
import { databaseRouter } from '@mgmt-api/routes/database.js';
import { extensionsRouter } from '@mgmt-api/routes/extensions.js';
import { feedsRouter } from '@mgmt-api/routes/feeds.js';
import { productRouter } from '@mgmt-api/routes/product/index.js';
import { statsRouter } from '@mgmt-api/routes/stats.js';
import { storageRouter } from '@mgmt-api/routes/storage.js';
import { usersRouter } from '@mgmt-api/routes/users.js';
import { workersRouter } from '@mgmt-api/routes/workers.js';
import { isLogLevelDebug } from '@podverse/helpers';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';

// --- App instance
export const app = express();
const port = config.api.port;

// --- Trust proxy (production)
// TODO: is this safe? Needed? The express-rate-limiter wanted it for the error message below:
// ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false (default).
// This could indicate a misconfiguration which would prevent express-rate-limit from accurately identifying users.
// See https://express-rate-limit.github.io/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/ for more information.
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

// --- Global middleware
app.use(
  cors({
    origin: config.api.allowedCORSOrigins,
    credentials: true,
  })
);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cookieParser());

app.use(initializePassport());

const baseUrl = `${config.api.prefix}${config.api.version}`;

// --- Unversioned GET /
// Informal dev ping only (not for K8s probes — use versioned /health).
app.get('/', (_req: Request, res: Response) => {
  res.status(200).json({ status: 'ok', message: 'Management API is online' });
});

// --- Versioned: meta, health, root (same order as main API / Metaboost versioned router)
app.get(`${baseUrl}/meta`, (_req: Request, res: Response) => {
  res.json({ version: config.api.version, release: config.api.release, status: 'ok' });
});

registerHealthRoutes(app, baseUrl);

app.get(`${baseUrl}/`, (_req: Request, res: Response) => {
  res.send(`${config.brandName} Management API is running on port ${port}`);
});

// --- Feature routers
app.use(authRouter);
app.use(adminsRouter);
app.use(databaseRouter);
app.use(extensionsRouter);
app.use(feedsRouter);
app.use(productRouter);
app.use(statsRouter);
app.use(storageRouter);
app.use(usersRouter);
app.use(workersRouter);

// --- Error handler
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (isLogLevelDebug(config.log.level)) {
    console.error('API Router Error:', err);
  }

  if (!res.headersSent) {
    res.status(500).json({ message: err.message });
  }
});

export const startApp = async (): Promise<import('http').Server | undefined> => {
  try {
    const server = app.listen(port, () => {
      // eslint-disable-next-line no-console
      console.log(`${config.brandName} Management API is running on port ${port}`);
    });

    return server;
  } catch (error) {
    if (isLogLevelDebug(config.log.level)) {
      console.error('API Top Level Router Error:', error);
    }
    return undefined;
  }
};
