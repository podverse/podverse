import { LoggerService, ILoggerLike, TimerManager } from '@podverse/helpers';
import { PodcastIndexService, FirebaseContext } from '@podverse/external-services';
import { NotificationsContext } from '@podverse/notifications';
import { ParserConfig } from './config/types';
import { setParserContext } from './context';

export type ParserContext = {
  config: ParserConfig;
  loggerService: ILoggerLike;
  podcastIndexService: PodcastIndexService;
  timerManager: TimerManager;
  notificationsContext: NotificationsContext;
  firebaseContext: FirebaseContext;
};

export type CreateParserContextParams = {
  config: ParserConfig;
  notificationsContext: NotificationsContext;
  firebaseContext: FirebaseContext;
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

  const podcastIndexService = new PodcastIndexService({
    userAgent: config.userAgent,
    authKey: config.podcastIndex.authKey,
    baseUrl: config.podcastIndex.baseUrl,
    secretKey: config.podcastIndex.secretKey,
    loggerService,
  });

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
