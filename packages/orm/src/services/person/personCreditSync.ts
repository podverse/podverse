import { generateRandomIdText } from '@orm/lib/nanoid.js';
import type { EntityManager } from 'typeorm';

import { personNameKey } from '@podverse/helpers';

type PersonRow = {
  id: number;
  id_text: string;
};

const PUBLIC_CHANNEL = `COALESCE((
  SELECT policy.public_visible
  FROM feed_policy policy
  WHERE policy.feed_id = channel.feed_id
), true)`;

function postgresCode(error: unknown): string | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  if ('code' in error && typeof error.code === 'string') {
    return error.code;
  }
  if ('driverError' in error) {
    return postgresCode(Reflect.get(error, 'driverError'));
  }
  return null;
}

function integerIds(rows: unknown): number[] {
  if (!Array.isArray(rows)) {
    return [];
  }
  const ids: number[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null || !('person_id' in row)) {
      continue;
    }
    const value = Reflect.get(row, 'person_id');
    const id = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (Number.isInteger(id)) {
      ids.push(id);
    }
  }
  return ids;
}

function personFromRow(rows: unknown): PersonRow | null {
  if (!Array.isArray(rows) || rows.length === 0) {
    return null;
  }
  const row = rows[0];
  if (typeof row !== 'object' || row === null || !('id' in row) || !('id_text' in row)) {
    return null;
  }
  const idValue = Reflect.get(row, 'id');
  const idText = Reflect.get(row, 'id_text');
  const id =
    typeof idValue === 'number' ? idValue : typeof idValue === 'string' ? Number(idValue) : NaN;
  if (!Number.isInteger(id) || typeof idText !== 'string') {
    return null;
  }
  return { id, id_text: idText };
}

async function upsertPerson(
  manager: EntityManager,
  nameKey: string,
  displayName: string
): Promise<PersonRow> {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const rows: unknown = await manager.query(
        `INSERT INTO person (id_text, name_key, distinction_key, display_name)
         VALUES ($1, $2, '', $3)
         ON CONFLICT (name_key, distinction_key)
         DO UPDATE SET display_name = person.display_name
         RETURNING id, id_text`,
        [generateRandomIdText(), nameKey, displayName.slice(0, 255)]
      );
      const person = personFromRow(rows);
      if (person === null) {
        throw new Error('person insert did not return a row');
      }
      return person;
    } catch (error) {
      if (postgresCode(error) === '23505' && attempt < 4) {
        continue;
      }
      throw error;
    }
  }
  throw new Error('person insert did not return a row');
}

async function linkNamedCredits(
  manager: EntityManager,
  table: 'channel_person' | 'item_person',
  parentColumn: 'channel_id' | 'item_id',
  parentId: number
): Promise<number[]> {
  const rows: unknown = await manager.query(
    `SELECT id, name FROM ${table} WHERE ${parentColumn} = $1`,
    [parentId]
  );
  if (!Array.isArray(rows)) {
    return [];
  }
  const personIds: number[] = [];
  for (const row of rows) {
    if (typeof row !== 'object' || row === null || !('id' in row) || !('name' in row)) {
      continue;
    }
    const creditId = Reflect.get(row, 'id');
    const name = Reflect.get(row, 'name');
    if (
      typeof name !== 'string' ||
      (typeof creditId !== 'number' && typeof creditId !== 'string')
    ) {
      continue;
    }
    const nameKey = personNameKey(name);
    if (nameKey === null) {
      await manager.query(
        `UPDATE ${table} SET person_id = NULL, person_id_text = NULL WHERE id = $1`,
        [creditId]
      );
      continue;
    }
    const person = await upsertPerson(manager, nameKey, name.trim());
    personIds.push(person.id);
    await manager.query(`UPDATE ${table} SET person_id = $1, person_id_text = $2 WHERE id = $3`, [
      person.id,
      person.id_text,
      creditId,
    ]);
  }
  return personIds;
}

async function recomputeChannelAppearanceCounts(
  manager: EntityManager,
  channelId: number,
  personIds: readonly number[]
): Promise<void> {
  if (personIds.length === 0) {
    await manager.query(
      `UPDATE channel SET person_appearance_count = (
         SELECT count(*)::int FROM channel_item_person_count WHERE channel_id = $1
       ) WHERE id = $1`,
      [channelId]
    );
    return;
  }
  await manager.query(
    `DELETE FROM channel_item_person_count
      WHERE channel_id = $1
        AND person_id = ANY($2::int[])
        AND person_id NOT IN (
          SELECT credit.person_id
          FROM item_person credit
          JOIN item ON item.id = credit.item_id
          WHERE item.channel_id = $1
            AND credit.person_id = ANY($2::int[])
        )`,
    [channelId, personIds]
  );
  await manager.query(
    `INSERT INTO channel_item_person_count (channel_id, person_id, item_count)
     SELECT $1, credit.person_id, count(DISTINCT credit.item_id)::int
     FROM item_person credit
     JOIN item ON item.id = credit.item_id
     WHERE item.channel_id = $1
       AND credit.person_id = ANY($2::int[])
     GROUP BY credit.person_id
     ON CONFLICT (channel_id, person_id)
     DO UPDATE SET item_count = EXCLUDED.item_count`,
    [channelId, personIds]
  );
  await manager.query(
    `UPDATE channel SET person_appearance_count = (
       SELECT count(*)::int FROM channel_item_person_count WHERE channel_id = $1
     ) WHERE id = $1`,
    [channelId]
  );
}

async function recomputePersons(
  manager: EntityManager,
  personIds: readonly number[]
): Promise<void> {
  if (personIds.length === 0) {
    return;
  }
  await manager.query(
    `UPDATE person
        SET item_appearance_count = COALESCE((
              SELECT count(DISTINCT credit.item_id)::int
              FROM item_person credit
              JOIN item ON item.id = credit.item_id
              JOIN channel ON channel.id = item.channel_id
              WHERE credit.person_id = person.id
                AND ${PUBLIC_CHANNEL}
            ), 0),
            channel_cast_count = COALESCE((
              SELECT count(DISTINCT credit.channel_id)::int
              FROM channel_person credit
              JOIN channel ON channel.id = credit.channel_id
              WHERE credit.person_id = person.id
                AND ${PUBLIC_CHANNEL}
            ), 0),
            latest_appearance_at = (
              SELECT max(item.pub_date)
              FROM item_person credit
              JOIN item ON item.id = credit.item_id
              JOIN channel ON channel.id = item.channel_id
              WHERE credit.person_id = person.id
                AND ${PUBLIC_CHANNEL}
            ),
            list_image_url = (
              SELECT image.img
              FROM (
                SELECT credit.img AS img, about.last_pub_date AS at, 1 AS rank
                FROM channel_person credit
                JOIN channel ON channel.id = credit.channel_id
                LEFT JOIN channel_about about ON about.channel_id = channel.id
                WHERE credit.person_id = person.id
                  AND credit.person_group = 'crew'
                  AND credit.img IS NOT NULL
                  AND credit.img <> ''
                UNION ALL
                SELECT credit.img, about.last_pub_date, 2
                FROM channel_person credit
                JOIN channel ON channel.id = credit.channel_id
                LEFT JOIN channel_about about ON about.channel_id = channel.id
                WHERE credit.person_id = person.id
                  AND credit.img IS NOT NULL
                  AND credit.img <> ''
                UNION ALL
                SELECT credit.img, item.pub_date, 3
                FROM item_person credit
                JOIN item ON item.id = credit.item_id
                WHERE credit.person_id = person.id
                  AND credit.img IS NOT NULL
                  AND credit.img <> ''
              ) image
              ORDER BY image.rank ASC, image.at DESC NULLS LAST
              LIMIT 1
            )
      WHERE person.id = ANY($1::int[])`,
    [personIds]
  );
}

function uniqueIds(left: readonly number[], right: readonly number[]): number[] {
  return [...new Set([...left, ...right])];
}

export async function readItemPersonIds(manager: EntityManager, itemId: number): Promise<number[]> {
  const rows: unknown = await manager.query(
    `SELECT DISTINCT person_id FROM item_person WHERE item_id = $1 AND person_id IS NOT NULL`,
    [itemId]
  );
  return integerIds(rows);
}

export async function readChannelPersonIds(
  manager: EntityManager,
  channelId: number
): Promise<number[]> {
  const rows: unknown = await manager.query(
    `SELECT DISTINCT person_id FROM channel_person WHERE channel_id = $1 AND person_id IS NOT NULL`,
    [channelId]
  );
  return integerIds(rows);
}

/** Links the item's credits to people and refreshes the counts those people and that channel use. */
export async function syncItemPeople(
  manager: EntityManager,
  itemId: number,
  channelId: number,
  previousPersonIds: readonly number[]
): Promise<void> {
  const current = await linkNamedCredits(manager, 'item_person', 'item_id', itemId);
  const touched = uniqueIds(previousPersonIds, current);
  if (Number.isInteger(channelId)) {
    await recomputeChannelAppearanceCounts(manager, channelId, touched);
  }
  await recomputePersons(manager, touched);
}

/** Links the channel's cast to people and refreshes those people's directory counts. */
export async function syncChannelPeople(
  manager: EntityManager,
  channelId: number,
  previousPersonIds: readonly number[]
): Promise<void> {
  const current = await linkNamedCredits(manager, 'channel_person', 'channel_id', channelId);
  await recomputePersons(manager, uniqueIds(previousPersonIds, current));
}

/** Rebuilds directory counts after a feed's public visibility changes. */
export async function recomputePersonsForFeed(
  manager: EntityManager,
  feedId: number
): Promise<void> {
  const channelRows: unknown = await manager.query(`SELECT id FROM channel WHERE feed_id = $1`, [
    feedId,
  ]);
  if (!Array.isArray(channelRows)) {
    return;
  }
  const channelIds: number[] = [];
  for (const row of channelRows) {
    if (typeof row !== 'object' || row === null || !('id' in row)) {
      continue;
    }
    const value = Reflect.get(row, 'id');
    const id = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
    if (Number.isInteger(id)) {
      channelIds.push(id);
    }
  }
  if (channelIds.length === 0) {
    return;
  }
  const personRows: unknown = await manager.query(
    `SELECT person_id FROM channel_person
      WHERE channel_id = ANY($1::int[]) AND person_id IS NOT NULL
     UNION
     SELECT person_id FROM channel_item_person_count
      WHERE channel_id = ANY($1::int[])
     UNION
     SELECT credit.person_id FROM item_person credit
      JOIN item ON item.id = credit.item_id
      WHERE item.channel_id = ANY($1::int[]) AND credit.person_id IS NOT NULL`,
    [channelIds]
  );
  await recomputePersons(manager, integerIds(personRows));
  for (const channelId of channelIds) {
    await recomputeChannelAppearanceCounts(manager, channelId, []);
  }
}
