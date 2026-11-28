import { getDataSourceRead, getDataSourceReadWrite } from '@orm/context.js';

import {
  escapePlaylistTagLikePrefix,
  normalizePlaylistTagList,
  normalizePlaylistTagName,
  PLAYLIST_TAG_SEARCH_LIMIT,
  SharableStatusEnum,
} from '@podverse/helpers';

export type PlaylistTagReplaceLimits = {
  maxCount: number;
  maxLength: number;
};

/**
 * Folded playlist tag names, and the names on each playlist in owner order.
 * A name with no assignment left is removed when the writing transaction commits.
 */
export class PlaylistTagService {
  async replaceForPlaylist(
    playlistId: number,
    rawNames: readonly string[],
    limits?: PlaylistTagReplaceLimits
  ): Promise<void> {
    const normalized = normalizePlaylistTagList(rawNames, limits);
    if (!normalized.ok) {
      throw new Error(`Playlist tag list rejected: ${normalized.reason}`);
    }

    await getDataSourceReadWrite().transaction(async (manager) => {
      const tagIds: number[] = [];
      for (const name of normalized.tags) {
        await manager.query(
          `INSERT INTO playlist_tag (name) VALUES ($1) ON CONFLICT (name) DO NOTHING`,
          [name]
        );
        const rows = rowsOf(
          await manager.query(`SELECT id FROM playlist_tag WHERE name = $1`, [name])
        );
        const id = readId(rows[0]?.id);
        if (id === null) {
          throw new Error(`Playlist tag has no catalog row: ${name}`);
        }
        tagIds.push(id);
      }

      // New assignments are inserted after the delete, still inside this transaction.
      // Unused names are removed at commit, once those assignments exist.
      await manager.query(`DELETE FROM playlist_tag_assignment WHERE playlist_id = $1`, [
        playlistId,
      ]);

      if (tagIds.length === 0) {
        return;
      }

      await manager.query(
        `INSERT INTO playlist_tag_assignment (playlist_id, playlist_tag_id, list_position)
         SELECT $1, tag_id, ordinality::smallint
         FROM unnest($2::int[]) WITH ORDINALITY AS ordered(tag_id, ordinality)`,
        [playlistId, tagIds]
      );
    });
  }

  async loadTagNamesByPlaylistIdText(idTexts: readonly string[]): Promise<Map<string, string[]>> {
    const tagsByIdText = new Map<string, string[]>();
    if (idTexts.length === 0) {
      return tagsByIdText;
    }

    const rows = rowsOf(
      await getDataSourceRead().manager.query(
        `SELECT playlist.id_text, playlist_tag.name
         FROM playlist
         INNER JOIN playlist_tag_assignment
           ON playlist_tag_assignment.playlist_id = playlist.id
         INNER JOIN playlist_tag
           ON playlist_tag.id = playlist_tag_assignment.playlist_tag_id
         WHERE playlist.id_text = ANY($1::text[])
         ORDER BY playlist.id_text, playlist_tag_assignment.list_position`,
        [idTexts]
      )
    );

    for (const row of rows) {
      const idText = readString(row.id_text);
      const name = readString(row.name);
      if (idText === null || name === null) {
        throw new Error('Playlist tag name row is missing id_text or name');
      }
      const names = tagsByIdText.get(idText);
      if (names === undefined) {
        tagsByIdText.set(idText, [name]);
      } else {
        names.push(name);
      }
    }

    return tagsByIdText;
  }

  async searchVisiblePrefix(rawPrefix: string): Promise<string[]> {
    const normalized = normalizePlaylistTagName(rawPrefix);
    if (!normalized.ok) {
      return [];
    }

    const pattern = `${escapePlaylistTagLikePrefix(normalized.name)}%`;
    const rows = rowsOf(
      await getDataSourceRead().manager.query(
        `SELECT playlist_tag.name
         FROM playlist_tag
         WHERE playlist_tag.name LIKE $1 ESCAPE '\\'
           AND EXISTS (
             SELECT 1
             FROM playlist_tag_assignment
             INNER JOIN playlist
               ON playlist.id = playlist_tag_assignment.playlist_id
             WHERE playlist_tag_assignment.playlist_tag_id = playlist_tag.id
               AND playlist.sharable_status_id IN ($2, $3)
           )
         ORDER BY playlist_tag.name ASC
         LIMIT $4`,
        [pattern, SharableStatusEnum.Public, SharableStatusEnum.Unlisted, PLAYLIST_TAG_SEARCH_LIMIT]
      )
    );

    return rows.map((row) => {
      const name = readString(row.name);
      if (name === null) {
        throw new Error('Playlist tag search row is missing name');
      }
      return name;
    });
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (!Array.isArray(result)) {
    return [];
  }
  return result.filter(isRecord);
}

function readId(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) {
    return Number(value);
  }
  return null;
}

function readString(value: unknown): string | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }
  return value;
}
