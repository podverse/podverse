// reflect-metadata before any import that can load TypeORM entities
// eslint-disable-next-line simple-import-sort/imports
import 'reflect-metadata';

import { config } from '@api/config/index.js';
import { loggerService } from '@api/factories/loggerService.js';
import { initializePassport } from '@api/lib/auth/index.js';
import bodyParser from 'body-parser';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import type { NextFunction, Request, Response } from 'express';
import express from 'express';

import { CategoryService } from '@podverse/orm';

import { registerHealthRoutes } from './lib/health/registerHealthRoutes.js';

// Route imports are deferred until after ORM initialization (see startApp).

// --- App instance
export const app = express();
const port = parseInt(config.api.port, 10);

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

export const startApp = async () => {
  try {
    // --- Unversioned GET /
    // Informal dev ping only (not for K8s probes — use versioned /health).
    app.get('/', (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', message: 'API is online' });
    });

    // --- Versioned: health (before heavy route modules)
    registerHealthRoutes(app, baseUrl);

    const categoryService = new CategoryService();
    await categoryService.setCategoryCache();

    // Import routes after ORM context is initialized
    const { accountRouter } = await import('@api/routes/account.js');
    const { authRouter } = await import('@api/routes/auth.js');
    const { categoryRouter } = await import('@api/routes/category.js');
    const { channelRouter } = await import('@api/routes/channel.js');
    const { clipRouter } = await import('@api/routes/clip.js');
    const { externalServicesRouter } = await import('@api/routes/externalServices.js');
    const { itemRouter } = await import('@api/routes/item.js');
    const { itemSoundbiteRouter } = await import('./routes/itemSoundbite.js');
    const { liveItemRouter } = await import('./routes/liveItem.js');
    const { mediumRouter } = await import('@api/routes/medium.js');
    const { membershipClaimTokenRouter } = await import('@api/routes/membershipClaimToken.js');
    const { membershipRouter } = await import('@api/routes/membership.js');
    const { metaboostRouter } = await import('@api/routes/metaboost.js');
    const { accountPayPalOrderRouter } = await import('@api/routes/paypal.js');
    const { playlistRouter } = await import('@api/routes/playlist.js');
    const { podrollRouter } = await import('@api/routes/podroll.js');
    const { queueRouter } = await import('@api/routes/queue.js');
    const { statsRouter } = await import('@api/routes/stats.js');
    const { itemTranscriptRouter } = await import('./routes/itemTranscript.js');
    const { itemChapterRouter } = await import('./routes/itemChapter.js');
    const { mqRouter } = await import('./routes/mq.js');
    const { feedRouter } = await import('./routes/feed.js');
    const { publisherFeedRouter } = await import('./routes/publisherFeed.js');
    const { accountSettingsRouter } = await import('./routes/accountSettings.js');
    const { profileContentRouter, myProfileContentRouter } =
      await import('./routes/profileContent.js');

    // --- Versioned: meta, then root (same order as Metaboost versioned router)
    app.get(`${baseUrl}/meta`, (_req: Request, res: Response) => {
      res.json({
        version: config.api.version,
        status: 'ok',
      });
    });

    app.get(`${baseUrl}/`, (_req: Request, res: Response) => {
      res.status(200).json({ status: 'ok', message: 'API is online' });
    });

    // --- Feature routers
    app.use(accountRouter);
    app.use(accountPayPalOrderRouter);
    app.use(accountSettingsRouter);
    app.use(authRouter);
    app.use(categoryRouter);
    app.use(channelRouter);
    app.use(clipRouter);
    app.use(externalServicesRouter);
    app.use(feedRouter);
    app.use(itemRouter);
    app.use(itemChapterRouter);
    app.use(itemSoundbiteRouter);
    app.use(itemTranscriptRouter);
    app.use(liveItemRouter);
    app.use(mediumRouter);
    app.use(metaboostRouter);
    app.use(membershipClaimTokenRouter);
    app.use(membershipRouter);
    app.use(mqRouter);
    app.use(playlistRouter);
    app.use(podrollRouter);
    app.use(profileContentRouter);
    app.use(myProfileContentRouter);
    app.use(publisherFeedRouter);
    app.use(queueRouter);
    app.use(statsRouter);

    // --- Error handler
    app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
      loggerService.logError('API Router Error', err);
      res.status(500).json({ message: err.message });
    });

    const server = app.listen(port, () => {
      loggerService.info(`The server is running on port ${port}`);
    });

    server.on('error', (err: Error & { code?: string }) => {
      if (err.code === 'EADDRINUSE') {
        loggerService.error(`API port ${port} is already in use. Exiting.`);
      } else {
        loggerService.error('HTTP server failed to start', err);
      }
      process.exit(1);
    });

    return server;
  } catch (error) {
    loggerService.logError('API Top Level Router Error', error as Error);
    throw error;
  }
};
