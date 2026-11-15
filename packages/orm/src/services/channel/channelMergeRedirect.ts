import { AppDataSourceRead } from '@orm/db/index.js';

export const IDENTITY_RESOLVE_MAX_IDS = 500;

export type ChannelMergeIdMove = {
  from_id_text: string;
  to_id_text: string;
};

export type ChannelMergePodcastIndexMove = {
  from: number;
  to_channel_id_text: string;
};

export type IdentityResolveResult = {
  channels: ChannelMergeIdMove[];
  items: ChannelMergeIdMove[];
  podcast_index_ids: ChannelMergePodcastIndexMove[];
};

const APPLIED_CHANNEL_SQL = `
SELECT from_channel.id_text AS from_id_text, to_channel.id_text AS to_id_text
FROM channel from_channel
INNER JOIN feed ON feed.id = from_channel.feed_id
INNER JOIN feed_lifecycle_state lifecycle ON lifecycle.feed_id = feed.id
INNER JOIN feed_lifecycle_state_type lifecycle_type
  ON lifecycle_type.id = lifecycle.feed_lifecycle_state_type_id
 AND lifecycle_type.state_key = 'merged'
INNER JOIN channel_merge merge
  ON merge.from_channel_id = from_channel.id
 AND merge.status = 'applied'
 AND merge.to_channel_id IS NOT NULL
INNER JOIN channel to_channel ON to_channel.id = merge.to_channel_id
`;

const APPLIED_ITEM_SQL = `
SELECT from_item.id_text AS from_id_text, to_item.id_text AS to_id_text
FROM item from_item
INNER JOIN item_merge_map map
  ON map.from_item_id = from_item.id
 AND map.to_item_id IS NOT NULL
INNER JOIN channel_merge merge
  ON merge.id = map.channel_merge_id
 AND merge.status = 'applied'
INNER JOIN item to_item ON to_item.id = map.to_item_id
`;

const APPLIED_PODCAST_INDEX_SQL = `
SELECT merge.from_podcast_index_id AS from_podcast_index_id,
       to_channel.id_text AS to_id_text
FROM channel_merge merge
INNER JOIN channel to_channel ON to_channel.id = merge.to_channel_id
WHERE merge.from_podcast_index_id = ANY($1::int[])
  AND merge.status = 'applied'
  AND merge.mode = 'absorb'
  AND merge.to_channel_id IS NOT NULL
`;

function isRow(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsOf(value: unknown): Record<string, unknown>[] {
  if (!Array.isArray(value)) {
    return [];
  }
  const rows: Record<string, unknown>[] = [];
  for (const entry of value) {
    if (isRow(entry)) {
      rows.push(entry);
    }
  }
  return rows;
}

function stringField(row: Record<string, unknown>, key: string): string | null {
  const value = row[key];
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function integerField(row: Record<string, unknown>, key: string): number | null {
  const value = row[key];
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[1-9]\d*$/.test(value)) {
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : null;
  }
  return null;
}

/**
 * A numeric path segment is a primary key. An id_text that is all digits is addressed the same
 * way as the channel and item lookups, so a bookmark of either form resolves to one row.
 */
function numericId(value: string): number | null {
  if (!/^[1-9]\d*$/.test(value)) {
    return null;
  }
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

function splitIds(ids: readonly string[]): { textIds: string[]; numericIds: number[] } {
  const textIds: string[] = [];
  const numericIds: number[] = [];
  const seenText = new Set<string>();
  const seenNumeric = new Set<number>();
  for (const id of ids) {
    const parsed = numericId(id);
    if (parsed !== null) {
      if (!seenNumeric.has(parsed)) {
        seenNumeric.add(parsed);
        numericIds.push(parsed);
      }
      continue;
    }
    if (id.length > 0 && !seenText.has(id)) {
      seenText.add(id);
      textIds.push(id);
    }
  }
  return { textIds, numericIds };
}

function idMoves(value: unknown): ChannelMergeIdMove[] {
  const moves: ChannelMergeIdMove[] = [];
  const seen = new Set<string>();
  for (const row of rowsOf(value)) {
    const fromIdText = stringField(row, 'from_id_text');
    const toIdText = stringField(row, 'to_id_text');
    if (fromIdText === null || toIdText === null || seen.has(fromIdText)) {
      continue;
    }
    seen.add(fromIdText);
    moves.push({ from_id_text: fromIdText, to_id_text: toIdText });
  }
  return moves;
}

async function queryIdMoves(
  sql: string,
  ids: readonly string[],
  textColumn: string,
  numericColumn: string
): Promise<ChannelMergeIdMove[]> {
  const { textIds, numericIds } = splitIds(ids);
  if (textIds.length === 0 && numericIds.length === 0) {
    return [];
  }
  const clauses: string[] = [];
  const params: unknown[] = [];
  if (textIds.length > 0) {
    params.push(textIds);
    clauses.push(`${textColumn} = ANY($${params.length}::text[])`);
  }
  if (numericIds.length > 0) {
    params.push(numericIds);
    clauses.push(`${numericColumn} = ANY($${params.length}::int[])`);
  }
  const value: unknown = await AppDataSourceRead.manager.query(
    `${sql} WHERE ${clauses.join(' OR ')}`,
    params
  );
  return idMoves(value);
}

/**
 * Reads applied absorb redirects. A re-point leaves `to_channel_id` null and is omitted, because
 * the channel and episode ids did not change.
 */
export class ChannelMergeRedirectService {
  async channelMoves(ids: readonly string[]): Promise<ChannelMergeIdMove[]> {
    return queryIdMoves(APPLIED_CHANNEL_SQL, ids, 'from_channel.id_text', 'from_channel.id');
  }

  async itemMoves(ids: readonly string[]): Promise<ChannelMergeIdMove[]> {
    return queryIdMoves(APPLIED_ITEM_SQL, ids, 'from_item.id_text', 'from_item.id');
  }

  async podcastIndexMoves(ids: readonly number[]): Promise<ChannelMergePodcastIndexMove[]> {
    const unique = [...new Set(ids.filter((id) => Number.isInteger(id) && id > 0))];
    if (unique.length === 0) {
      return [];
    }
    const value: unknown = await AppDataSourceRead.manager.query(APPLIED_PODCAST_INDEX_SQL, [
      unique,
    ]);
    const moves: ChannelMergePodcastIndexMove[] = [];
    const seen = new Set<number>();
    for (const row of rowsOf(value)) {
      const from = integerField(row, 'from_podcast_index_id');
      const toChannelIdText = stringField(row, 'to_id_text');
      if (from === null || toChannelIdText === null || seen.has(from)) {
        continue;
      }
      seen.add(from);
      moves.push({ from, to_channel_id_text: toChannelIdText });
    }
    return moves;
  }

  async channelMove(idOrIdText: string): Promise<ChannelMergeIdMove | null> {
    const moves = await this.channelMoves([idOrIdText]);
    return moves[0] ?? null;
  }

  async itemMove(idOrIdText: string): Promise<ChannelMergeIdMove | null> {
    const moves = await this.itemMoves([idOrIdText]);
    return moves[0] ?? null;
  }

  async survivorIdTextForPodcastIndexId(podcastIndexId: number): Promise<string | null> {
    const moves = await this.podcastIndexMoves([podcastIndexId]);
    return moves[0]?.to_channel_id_text ?? null;
  }

  /** Applied absorb redirects for these Podcast Index ids, keyed by the absorbed id. */
  async survivorIdTextForPodcastIndexIds(
    podcastIndexIds: readonly number[]
  ): Promise<Map<number, string>> {
    const moves = await this.podcastIndexMoves(podcastIndexIds);
    const byId = new Map<number, string>();
    for (const move of moves) {
      byId.set(move.from, move.to_channel_id_text);
    }
    return byId;
  }

  async resolve(input: {
    channelIdTexts: readonly string[];
    itemIdTexts: readonly string[];
    podcastIndexIds: readonly number[];
  }): Promise<IdentityResolveResult> {
    const [channels, items, podcastIndexIds] = await Promise.all([
      this.channelMoves(input.channelIdTexts),
      this.itemMoves(input.itemIdTexts),
      this.podcastIndexMoves(input.podcastIndexIds),
    ]);
    return {
      channels,
      items,
      podcast_index_ids: podcastIndexIds,
    };
  }
}
