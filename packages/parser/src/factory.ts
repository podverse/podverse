import type { ILoggerLike } from '@podverse/helpers-backend';
import { LoggerService, TimerManager } from '@podverse/helpers-backend';
import type { FirebaseContext } from '@podverse/external-services-firebase';
import { PodcastIndexService } from '@podverse/external-services-podcast-index';
import type { NotificationsContext } from '@podverse/notifications';
import type { ParserConfig } from './config/types.js';
import { setParserContext } from './context.js';
import { createMockPodcastIndexService } from './lib/mockPodcastIndexService.js';

export type ParserContext = {
  config: ParserConfig;
  loggerService: ILoggerLike;
  podcastIndexService?: PodcastIndexService;
  timerManager: TimerManager;
  notificationsContext?: NotificationsContext;
  firebaseContext?: FirebaseContext;
};

export type CreateParserContextParams = {
  config: ParserConfig;
  notificationsContext?: NotificationsContext;
  firebaseContext?: FirebaseContext;
};

/**
 * Creates a parser context with the provided configuration.
 * This is the factory function that should be called from the app level.
 *
 * NOTE: This requires createORMContext() to be called first, as the parser
 * uses ORM services internally.
 *
 * @param params - The parser configuration and external contexts
 * @returns ParserContext with initialized services
 */
export function createParserContext(params: CreateParserContextParams): ParserContext {
  const { config, notificationsContext, firebaseContext } = params;

  const loggerService = new LoggerService({
    logLevel: config.log.level,
  });

  const podcastIndexService = config.testAssetsMode
    ? createMockPodcastIndexService()
    : config.podcastIndex
      ? new PodcastIndexService({
          userAgent: config.userAgent,
          authKey: config.podcastIndex.authKey,
          baseUrl: config.podcastIndex.baseUrl,
          secretKey: config.podcastIndex.secretKey,
          loggerService,
        })
      : undefined;

  const timerManager = new TimerManager(config.log.timer || false, loggerService);

  const context: ParserContext = {
    config,
    loggerService,
    podcastIndexService,
    timerManager,
    notificationsContext,
    firebaseContext,
  };

  // Set the module-level context so services can access it
  setParserContext(context);

  return context;
}
