import type { ILoggerLike, TimerManager } from '@podverse/helpers-backend';
import type { FirebaseContext } from '@podverse/external-services-firebase';
import type { PodcastIndexService } from '@podverse/external-services-podcast-index';
import type { NotificationsContext } from '@podverse/notifications';
import type { ParserConfig } from './config/types.js';

/**
 * Module-level context holder for the parser.
 * This is set by createParserContext() and used by parser functions.
 */
let _context: {
  config: ParserConfig;
  loggerService: ILoggerLike;
  podcastIndexService?: PodcastIndexService;
  timerManager: TimerManager;
  notificationsContext?: NotificationsContext;
  firebaseContext?: FirebaseContext;
} | null = null;

export function setParserContext(context: {
  config: ParserConfig;
  loggerService: ILoggerLike;
  podcastIndexService?: PodcastIndexService;
  timerManager: TimerManager;
  notificationsContext?: NotificationsContext;
  firebaseContext?: FirebaseContext;
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
  const service = getParserContext().podcastIndexService;
  if (!service) {
    throw new Error('Podcast Index service not configured for this parser context.');
  }
  return service;
}

export function getTimerManager(): TimerManager {
  return getParserContext().timerManager;
}

export function getNotificationsContext(): NotificationsContext {
  const context = getParserContext().notificationsContext;
  if (!context) {
    throw new Error('Notifications context not configured for this parser context.');
  }
  return context;
}

export function getFirebaseContext(): FirebaseContext {
  const context = getParserContext().firebaseContext;
  if (!context) {
    throw new Error('Firebase context not configured for this parser context.');
  }
  return context;
}
