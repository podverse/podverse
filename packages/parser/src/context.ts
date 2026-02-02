import type { ILoggerLike, TimerManager } from '@podverse/helpers-backend';
import type { PodcastIndexService, FirebaseContext } from '@podverse/external-services';
import type { NotificationsContext } from '@podverse/notifications';
import type { ParserConfig } from './config/types.js';

/**
 * Module-level context holder for the parser.
 * This is set by createParserContext() and used by parser functions.
 */
let _context: {
  config: ParserConfig;
  loggerService: ILoggerLike;
  podcastIndexService: PodcastIndexService;
  timerManager: TimerManager;
  notificationsContext: NotificationsContext;
  firebaseContext: FirebaseContext;
} | null = null;

export function setParserContext(context: {
  config: ParserConfig;
  loggerService: ILoggerLike;
  podcastIndexService: PodcastIndexService;
  timerManager: TimerManager;
  notificationsContext: NotificationsContext;
  firebaseContext: FirebaseContext;
}): void {
  _context = context;
}

export function getParserContext() {
  if (!_context) {
    throw new Error('Parser context not initialized. Call createParserContext() first.');
  }
  return _context;
}

// Convenience accessors
export function getParserConfig(): ParserConfig {
  return getParserContext().config;
}

export function getLoggerService(): ILoggerLike {
  return getParserContext().loggerService;
}

export function getPodcastIndexService(): PodcastIndexService {
  return getParserContext().podcastIndexService;
}

export function getTimerManager(): TimerManager {
  return getParserContext().timerManager;
}

export function getNotificationsContext(): NotificationsContext {
  return getParserContext().notificationsContext;
}

export function getFirebaseContext(): FirebaseContext {
  return getParserContext().firebaseContext;
}
