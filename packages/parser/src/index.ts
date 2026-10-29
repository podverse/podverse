// Config types for app-level configuration
export * from './config/index.js';

// Factory function to create the parser context
export { createParserContext } from './factory.js';
export type { ParserContext } from './factory.js';

// Parser exports
export { parseChapters } from './lib/chapters/chapters.js';
export { getAndParseRSSFeed, parseRSSFeedAndSaveToDatabase } from './lib/rss/parser.js';
export type {
  ParseRSSFeedAndSaveToDatabaseOptions,
  ParseRSSFeedAndSaveToDatabaseResult,
} from './lib/rss/parser.js';
export {
  REMOTE_STUB_MAX_SINGLE_LOOKUPS_PER_RUN,
  REMOTE_STUB_REFRESH_AFTER_MS,
  resolveRemoteStubsForRefs,
} from './lib/rss/remoteItemStubs.js';
export type {
  RemoteStubRef,
  RemoteStubRefOutcome,
  ResolveRemoteStubsOptions,
  ResolveRemoteStubsResult,
} from './lib/rss/remoteItemStubs.js';
export { parseRSSFeedForAddByRSS } from './lib/rss/addByRSS.js';
export type {
  AddByRSSConditionalCache,
  ParseRSSFeedForAddByRSSOptions,
  ParseRSSFeedForAddByRSSResult,
} from './lib/rss/addByRSS.js';
export { buildCredentialScopedBeforeRedirect } from './lib/rss/addByRSSRedirectAuth.js';
export type { CredentialsWithheldDecision } from './lib/rss/addByRSSRedirectAuth.js';
