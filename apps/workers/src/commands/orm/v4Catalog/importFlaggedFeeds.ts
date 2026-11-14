import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';
import { Client } from 'pg';

import type { ApplyFeedModerationChangesParams, Feed } from '@podverse/orm';
import {
  FeedConditionSourceEnum,
  FeedConditionTypeKeyEnum,
  FeedLifecycleStateKeyEnum,
  FeedLifecycleUpdateSourceEnum,
  FeedPolicyService,
  FeedService,
} from '@podverse/orm';

import { assertLocalDatabase } from '../v4Library/copyAccountLibrary.js';
import { parsePodcastIndexId } from '../v4Library/copyAccountLibraryLib.js';
import type {
  FlaggedFeedDecision,
  FlaggedFeedStored,
  V4FlaggedFeedFlag,
} from './importFlaggedFeedsLib.js';
import { canonicalFlaggedFeedUrl, decideFlaggedFeedImport } from './importFlaggedFeedsLib.js';
import { queryV4, textOrNull } from './seedCatalogApply.js';

export const V4_IMPORT_FLAGGED_FEEDS_HELP = `v4ImportFlaggedFeeds

Read every v4 podcast with flag_status spam or takedown and write a blocked v5
feed. The command reads V4_DATABASE_URL, writes blocked feeds, creates no
channel, and queues no parse. --dry-run reads v4 and the local feeds and writes
nothing.

Flags:
  --dry-run     Count only. Do not write
  --help        Show this text

Refuses unless DB_HOST is local, including a dry run. The log is counts only.
`;

const PAGE_SIZE = 500;

const SPAM_NOTE = 'v4 flag_status spam';
const TAKEDOWN_NOTE = 'v4 flag_status takedown';

const FLAGGED_FEED_SQL = `
SELECT DISTINCT ON (p.id)
       p.id,
       p."podcastIndexId" AS podcast_index_id,
       NULLIF(btrim(f.url), '') AS authority_url,
       p.flag_status::text AS flag_status
FROM podcasts p
LEFT JOIN "feedUrls" f
  ON f."podcastId" = p.id AND f."isAuthority" IS TRUE
WHERE p.flag_status IN ('spam', 'takedown')
  AND p.id > $1
ORDER BY p.id, f.url
LIMIT $2
`;

type FlaggedFeedImportCounts = Record<FlaggedFeedDecision, number>;

function hasOption(args: CommandLineArgs, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(args, name);
}

function emptyCounts(): FlaggedFeedImportCounts {
  return {
    apply_spam: 0,
    apply_takedown: 0,
    already_blocked: 0,
    skip_no_podcast_index_id: 0,
    skip_no_authority_url: 0,
    skip_url_held_by_other: 0,
  };
}

function flagOf(value: unknown): V4FlaggedFeedFlag {
  const flag = textOrNull(value);
  if (flag === 'spam' || flag === 'takedown') {
    return flag;
  }
  throw new Error('Unexpected v4 flag_status.');
}

function lifecycleKeyOf(feed: Feed): FeedLifecycleStateKeyEnum | null {
  return feed.feed_lifecycle_state?.feed_lifecycle_state_type?.state_key ?? null;
}

function moderationParams(
  decision: 'apply_spam' | 'apply_takedown',
  lifecycleKey: FeedLifecycleStateKeyEnum | null
): ApplyFeedModerationChangesParams {
  if (decision === 'apply_takedown') {
    return {
      conditionMutations: [
        {
          conditionKey: FeedConditionTypeKeyEnum.TakedownActive,
          isActive: true,
          source: FeedConditionSourceEnum.Auto,
          note: TAKEDOWN_NOTE,
        },
      ],
      lifecycle: {
        toStateKey: FeedLifecycleStateKeyEnum.Takedown,
        reasonKey: 'other',
        note: TAKEDOWN_NOTE,
        source: FeedLifecycleUpdateSourceEnum.System,
      },
    };
  }

  const params: ApplyFeedModerationChangesParams = {
    conditionMutations: [
      {
        conditionKey: FeedConditionTypeKeyEnum.SpamDetected,
        isActive: true,
        source: FeedConditionSourceEnum.Auto,
        note: SPAM_NOTE,
      },
    ],
  };
  if (lifecycleKey !== FeedLifecycleStateKeyEnum.Active) {
    params.lifecycle = {
      toStateKey: FeedLifecycleStateKeyEnum.Active,
      source: FeedLifecycleUpdateSourceEnum.System,
      note: SPAM_NOTE,
    };
  }
  return params;
}

async function storedFromFeed(
  policyService: FeedPolicyService,
  feed: Feed | null
): Promise<FlaggedFeedStored | null> {
  if (feed === null) {
    return null;
  }
  const keys = await policyService.getActiveConditionKeys(feed.id);
  return {
    podcastIndexId: feed.podcast_index_id,
    lifecycleIsTakedown: lifecycleKeyOf(feed) === FeedLifecycleStateKeyEnum.Takedown,
    spamDetectedActive: keys.includes(FeedConditionTypeKeyEnum.SpamDetected),
    takedownActive: keys.includes(FeedConditionTypeKeyEnum.TakedownActive),
  };
}

async function applyBlock(
  feedService: FeedService,
  decision: 'apply_spam' | 'apply_takedown',
  podcastIndexId: number,
  authorityUrl: string,
  byId: Feed | null,
  byUrl: Feed | null
): Promise<void> {
  let feed: Feed;
  if (byId !== null) {
    feed = byId;
  } else if (byUrl !== null && byUrl.podcast_index_id === podcastIndexId) {
    feed = byUrl;
  } else if (byUrl !== null) {
    throw new Error('Refusing to create a feed whose authority URL is already stored.');
  } else {
    feed = await feedService.getOrCreate({
      url: authorityUrl,
      podcast_index_id: podcastIndexId,
    });
    if (feed.podcast_index_id !== podcastIndexId) {
      throw new Error('Refusing to create a feed whose authority URL is already stored.');
    }
  }
  await feedService.applyFeedModerationChanges(
    feed.id,
    moderationParams(decision, lifecycleKeyOf(feed))
  );
}

async function importRow(
  feedService: FeedService,
  policyService: FeedPolicyService,
  row: Record<string, unknown>,
  dryRun: boolean,
  counts: FlaggedFeedImportCounts
): Promise<void> {
  const flag = flagOf(row.flag_status);
  const podcastIndexRaw = textOrNull(row.podcast_index_id);
  const parsedId = parsePodcastIndexId(podcastIndexRaw);
  const authorityUrl = canonicalFlaggedFeedUrl(textOrNull(row.authority_url));
  const byId = parsedId === null ? null : await feedService.getByPodcastIndexId(parsedId);
  const byUrl = authorityUrl === null ? null : await feedService.getByUrl({ url: authorityUrl });
  const decision = decideFlaggedFeedImport({
    flag,
    podcastIndexId: podcastIndexRaw,
    authorityUrl,
    feedByPodcastIndexId: await storedFromFeed(policyService, byId),
    feedByAuthorityUrl: await storedFromFeed(policyService, byUrl),
  });
  counts[decision] += 1;
  if (dryRun || (decision !== 'apply_spam' && decision !== 'apply_takedown')) {
    return;
  }
  if (parsedId === null || authorityUrl === null) {
    throw new Error('Refusing to write a blocked feed without a Podcast Index id and URL.');
  }
  await applyBlock(feedService, decision, parsedId, authorityUrl, byId, byUrl);
}

async function importPages(client: Client, dryRun: boolean): Promise<FlaggedFeedImportCounts> {
  const counts = emptyCounts();
  const feedService = new FeedService();
  const policyService = new FeedPolicyService();
  let afterId = '';
  for (;;) {
    let rows: Record<string, unknown>[];
    try {
      rows = await queryV4(client, FLAGGED_FEED_SQL, [afterId, PAGE_SIZE]);
    } catch (error) {
      throw new Error('Could not read the v4 catalog.', { cause: error });
    }
    for (const row of rows) {
      await importRow(feedService, policyService, row, dryRun, counts);
    }
    if (rows.length < PAGE_SIZE) {
      break;
    }
    const lastId = textOrNull(rows[rows.length - 1]?.id);
    if (lastId === null || lastId === afterId) {
      throw new Error('Could not read the v4 catalog.');
    }
    afterId = lastId;
  }
  return counts;
}

function logFinished(dryRun: boolean, counts: FlaggedFeedImportCounts): void {
  getLogger().info(
    dryRun ? 'v4 flagged feed import dry run finished' : 'v4 flagged feed import finished',
    {
      dryRun,
      ...counts,
    }
  );
}

/**
 * Writes a blocked v5 feed for each v4 spam or takedown podcast.
 * The log is the counts. No podcast id, feed URL, or connection string is logged.
 */
export const v4ImportFlaggedFeeds = async (args: CommandLineArgs): Promise<void> => {
  if (hasOption(args, 'help')) {
    process.stdout.write(V4_IMPORT_FLAGGED_FEEDS_HELP);
    return;
  }

  const dryRun = hasOption(args, 'dry-run');
  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';
  if (connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }
  assertLocalDatabase();

  const client = new Client({ connectionString });
  try {
    try {
      await client.connect();
    } catch (error) {
      throw new Error('Could not read the v4 catalog.', { cause: error });
    }
    const counts = await importPages(client, dryRun);
    logFinished(dryRun, counts);
  } finally {
    await client.end().catch(() => undefined);
  }
};
