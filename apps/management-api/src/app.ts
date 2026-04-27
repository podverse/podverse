// reflect-metadata before any import that can load TypeORM entities
// eslint-disable-next-line simple-import-sort/imports
import 'reflect-metadata';
import { config } from '@mgmt-api/config/index.js';
import { initializePassport } from '@mgmt-api/lib/auth/index.js';
import { adminAccountRouter } from '@mgmt-api/routes/adminAccount.js';
import { adminsRouter } from '@mgmt-api/routes/admins.js';
import { authRouter } from '@mgmt-api/routes/auth.js';
import { databaseRouter } from '@mgmt-api/routes/database.js';
import { feedFlagStatusRouter } from '@mgmt-api/routes/feedFlagStatus.js';
import { statsRouter } from '@mgmt-api/routes/stats.js';
import { workerCommandsRouter } from '@mgmt-api/routes/workerCommands.js';
import { usersRouter } from '@mgmt-api/routes/users.js';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';

export const app = express();
const port = config.api.port;

// TODO: is this safe? Needed? The express-rate-limiter wanted it for the error message below:
// ValidationError: The 'X-Forwarded-For' header is set but the Express 'trust proxy' setting is false (default).
// This could indicate a misconfiguration which would prevent express-rate-limit from accurately identifying users.
// See https://express-rate-limit.github.io/ERR_ERL_UNEXPECTED_X_FORWARDED_FOR/ for more information.
if (config.nodeEnv === 'production') {
  app.set('trust proxy', 1);
}

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

app.get(`${baseUrl}/`, (_req: Request, res: Response) => {
  res.send(`${config.brandName} Management API is running on port ${port}`);
});

app.use(authRouter);
app.use(adminAccountRouter);
app.use(adminsRouter);
app.use(databaseRouter);
app.use(feedFlagStatusRouter);
app.use(statsRouter);
app.use(workerCommandsRouter);
app.use(usersRouter);

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('API Router Error:', err);

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
    console.error('API Top Level Router Error:', error);
    return undefined;
  }
};
