import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@management-api/orm/db/appDb.js';
import type { EntityManager } from 'typeorm';

import type { FeedPolicyReasonEnum } from '@podverse/orm';
import {
  applyLifecycleConstraintsToEffectiveFlags,
  assertLifecycleTransitionAllowed,
  computeEffectivePolicyFromConditionKeys,
  FeedConditionTypeKeyEnum,
  FeedLifecycleStateKeyEnum,
  FeedLifecycleUpdateSourceEnum,
} from '@podverse/orm';

const MANAGEABLE_CONDITION_KEYS = Object.freeze(Object.values(FeedConditionTypeKeyEnum));

function normalizeConditionKeys(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((k): k is string => typeof k === 'string');
}

export type FeedOperationsLookupRow = {
  id: number;
  url: string;
  podcast_index_id: number;
  spam_item_limit_override: number | null;
  max_response_body_bytes_override: number | null;
  lifecycle_state_key: string;
  lifecycle_reason: string | null;
  updated_source: string;
  active_condition_keys: string[];
  parse_allowed: boolean;
  public_visible: boolean;
  add_allowed: boolean;
  primary_block_reason: string | null;
  policy_overrides: {
    parse_allowed_override: boolean | null;
    public_visible_override: boolean | null;
    add_allowed_override: boolean | null;
  } | null;
  channel_title: string | null;
};

const LOOKUP_SQL_BODY = `
  f.id,
  f.url,
  f.podcast_index_id,
  f.spam_item_limit_override,
  f.max_response_body_bytes_override,
  COALESCE(flst.state_key::text, '') AS lifecycle_state_key,
  fls.reason_key AS lifecycle_reason,
  COALESCE(fls.updated_by_source::text, 'system') AS updated_source,
  COALESCE(fp.parse_allowed, true) AS parse_allowed,
  COALESCE(fp.public_visible, true) AS public_visible,
  COALESCE(fp.add_allowed, true) AS add_allowed,
  fp.primary_block_reason::text AS primary_block_reason,
  fpo.parse_allowed_override AS parse_allowed_override,
  fpo.public_visible_override AS public_visible_override,
  fpo.add_allowed_override AS add_allowed_override,
  c.title AS channel_title,
  COALESCE(
    (
      SELECT array_agg(fct.condition_key ORDER BY fct.condition_key)
      FROM feed_condition fc
      INNER JOIN feed_condition_type fct ON fct.id = fc.feed_condition_type_id
      WHERE fc.feed_id = f.id AND fc.is_active = true
    ),
    ARRAY[]::varchar[]
  ) AS active_condition_keys
FROM feed f
LEFT JOIN feed_lifecycle_state fls ON fls.feed_id = f.id
LEFT JOIN feed_lifecycle_state_type flst ON flst.id = fls.feed_lifecycle_state_type_id
LEFT JOIN feed_policy fp ON fp.feed_id = f.id
LEFT JOIN feed_policy_override fpo ON fpo.feed_id = f.id
LEFT JOIN channel c ON c.feed_id = f.id
`;

function mapLookupRow(row: Record<string, unknown>): FeedOperationsLookupRow {
  const rawKeys = row.active_condition_keys;
  const keys = normalizeConditionKeys(Array.isArray(rawKeys) ? rawKeys : []);

  const hasOverrideRow =
    row.parse_allowed_override !== undefined ||
    row.public_visible_override !== undefined ||
    row.add_allowed_override !== undefined;

  const policyOverrides = hasOverrideRow
    ? {
        parse_allowed_override:
          row.parse_allowed_override === null || row.parse_allowed_override === undefined
            ? null
            : Boolean(row.parse_allowed_override),
        public_visible_override:
          row.public_visible_override === null || row.public_visible_override === undefined
            ? null
            : Boolean(row.public_visible_override),
        add_allowed_override:
          row.add_allowed_override === null || row.add_allowed_override === undefined
            ? null
            : Boolean(row.add_allowed_override),
      }
    : null;

  return {
    id: Number(row.id),
    url: String(row.url),
    podcast_index_id: Number(row.podcast_index_id),
    spam_item_limit_override:
      row.spam_item_limit_override === null || row.spam_item_limit_override === undefined
        ? null
        : Number(row.spam_item_limit_override),
    max_response_body_bytes_override:
      row.max_response_body_bytes_override === null ||
      row.max_response_body_bytes_override === undefined
        ? null
        : Number(row.max_response_body_bytes_override),
    lifecycle_state_key: String(row.lifecycle_state_key ?? ''),
    lifecycle_reason:
      row.lifecycle_reason === null || row.lifecycle_reason === undefined
        ? null
        : String(row.lifecycle_reason),
    updated_source: String(row.updated_source ?? 'system'),
    active_condition_keys: keys,
    parse_allowed: Boolean(row.parse_allowed),
    public_visible: Boolean(row.public_visible),
    add_allowed: Boolean(row.add_allowed),
    primary_block_reason:
      row.primary_block_reason === null || row.primary_block_reason === undefined
        ? null
        : String(row.primary_block_reason),
    policy_overrides: policyOverrides,
    channel_title:
      row.channel_title === null || row.channel_title === undefined
        ? null
        : String(row.channel_title),
  };
}

export async function findFeedByPodcastIndexId(
  podcastIndexId: number
): Promise<FeedOperationsLookupRow | null> {
  const rows = (await AppDbDataSourceRead.query(
    `SELECT ${LOOKUP_SQL_BODY}
  WHERE f.podcast_index_id = $1
  LIMIT 1`,
    [podcastIndexId]
  )) as Record<string, unknown>[];
  const row = rows[0];
  return row ? mapLookupRow(row) : null;
}

export async function findFeedByInternalId(
  feedId: number
): Promise<FeedOperationsLookupRow | null> {
  const rows = (await AppDbDataSourceRead.query(
    `SELECT ${LOOKUP_SQL_BODY}
  WHERE f.id = $1
  LIMIT 1`,
    [feedId]
  )) as Record<string, unknown>[];
  const row = rows[0];
  return row ? mapLookupRow(row) : null;
}

export async function findFeedByUrl(url: string): Promise<FeedOperationsLookupRow | null> {
  const rows = (await AppDbDataSourceRead.query(
    `SELECT ${LOOKUP_SQL_BODY}
  WHERE f.url = $1
  LIMIT 1`,
    [url]
  )) as Record<string, unknown>[];
  const row = rows[0];
  return row ? mapLookupRow(row) : null;
}

export type FeedOperationsListSortKey =
  | 'id'
  | 'podcast_index_id'
  | 'channel_title'
  | 'lifecycle_state_key'
  | 'url';

export type ListFeedOperationsForTableParams = {
  page: number;
  limit: number;
  sort: FeedOperationsListSortKey;
  order: 'asc' | 'desc';
  q: string | null;
  lifecycle: string | null;
};

export type ListFeedOperationsForTableResult = {
  feeds: FeedOperationsLookupRow[];
  total: number;
};

const LIST_SORT_SQL: Record<FeedOperationsListSortKey, string> = {
  id: 'f.id',
  podcast_index_id: 'f.podcast_index_id',
  channel_title: "LOWER(COALESCE(c.title, ''))",
  lifecycle_state_key: "LOWER(COALESCE(flst.state_key::text, ''))",
  url: 'LOWER(f.url)',
};

function buildListWhereClause(params: { q: string | null; lifecycle: string | null }): {
  sql: string;
  values: unknown[];
} {
  const values: unknown[] = [];
  let i = 1;
  const parts: string[] = ['TRUE'];

  if (params.lifecycle !== null && params.lifecycle.trim() !== '') {
    parts.push(`flst.state_key::text = $${i}`);
    values.push(params.lifecycle.trim());
    i += 1;
  }

  const qt = params.q !== null ? params.q.trim() : '';
  if (qt !== '') {
    parts.push(
      `(c.title ILIKE $${i} OR f.url ILIKE $${i} OR f.id::text = $${i + 1} OR f.podcast_index_id::text = $${i + 1})`
    );
    values.push(`%${qt}%`, qt);
  }

  return {
    sql: parts.join(' AND '),
    values,
  };
}

export async function listFeedOperationsForTable(
  args: ListFeedOperationsForTableParams
): Promise<ListFeedOperationsForTableResult> {
  const sortCol = LIST_SORT_SQL[args.sort];
  if (sortCol === undefined) {
    throw new Error('Invalid sort key');
  }
  const orderDir = args.order === 'asc' ? 'ASC' : 'DESC';
  const whereBuilt = buildListWhereClause({ q: args.q, lifecycle: args.lifecycle });
  const offset = (args.page - 1) * args.limit;

  const countRows = (await AppDbDataSourceRead.query(
    `SELECT COUNT(*)::bigint AS c
     FROM feed f
     LEFT JOIN feed_lifecycle_state fls ON fls.feed_id = f.id
     LEFT JOIN feed_lifecycle_state_type flst ON flst.id = fls.feed_lifecycle_state_type_id
     LEFT JOIN feed_policy fp ON fp.feed_id = f.id
     LEFT JOIN feed_policy_override fpo ON fpo.feed_id = f.id
     LEFT JOIN channel c ON c.feed_id = f.id
     WHERE ${whereBuilt.sql}`,
    whereBuilt.values
  )) as { c: bigint }[];
  const total = Number(countRows[0]?.c ?? 0);

  const dataValues = [...whereBuilt.values, args.limit, offset];
  const limitPos = whereBuilt.values.length + 1;
  const offsetPos = whereBuilt.values.length + 2;

  const rows = (await AppDbDataSourceRead.query(
    `SELECT ${LOOKUP_SQL_BODY}
     WHERE ${whereBuilt.sql}
     ORDER BY ${sortCol} ${orderDir} NULLS LAST
     LIMIT $${limitPos} OFFSET $${offsetPos}`,
    dataValues
  )) as Record<string, unknown>[];

  return {
    feeds: rows.map((r) => mapLookupRow(r)),
    total,
  };
}

export type LifecycleStateOption = { state_key: string };
export type ConditionTypeOption = { condition_key: string };
export type TakedownReasonOption = { reason: string };

export async function listLifecycleStateOptions(): Promise<LifecycleStateOption[]> {
  return (await AppDbDataSourceRead.query(
    `SELECT state_key::text AS state_key FROM feed_lifecycle_state_type ORDER BY id ASC`
  )) as LifecycleStateOption[];
}

export async function listConditionTypeOptions(): Promise<ConditionTypeOption[]> {
  return (await AppDbDataSourceRead.query(
    `SELECT condition_key::text AS condition_key FROM feed_condition_type ORDER BY id ASC`
  )) as ConditionTypeOption[];
}

export async function listTakedownReasonOptions(): Promise<TakedownReasonOption[]> {
  return (await AppDbDataSourceRead.query(
    `SELECT reason::text AS reason FROM feed_takedown_reason ORDER BY id ASC`
  )) as TakedownReasonOption[];
}

export async function assertTakedownReasonExists(reason: string): Promise<boolean> {
  const rows = (await AppDbDataSourceRead.query(
    `SELECT 1::text AS c FROM feed_takedown_reason WHERE reason = $1`,
    [reason]
  )) as { c: string }[];
  return rows.length > 0;
}

export async function getFeedAuditSnapshotById(
  feedId: number
): Promise<Record<string, unknown> | null> {
  const row = await findFeedByInternalId(feedId);
  if (!row) {
    return null;
  }
  return { ...row } as Record<string, unknown>;
}

export type UpdateFeedOperationsPolicyStateParams = {
  lifecycleStateKey?: FeedLifecycleStateKeyEnum;
  activeConditionKeys?: FeedConditionTypeKeyEnum[];
  lifecycleReasonKey?: string | null;
  transitionNote?: string | null;
  conditionNote?: string | null;
  spamItemLimitOverride?: number | null;
  maxResponseBodyBytesOverride?: number | null;
  policyOverrides?: {
    parse_allowed_override?: boolean | null;
    public_visible_override?: boolean | null;
    add_allowed_override?: boolean | null;
  } | null;
  /** See 05b management API contract — transitional takedown without `takedown_active`. */
  takedownTransitional?: boolean;
};

async function readCurrentLifecycleKey(
  manager: EntityManager,
  feedId: number
): Promise<FeedLifecycleStateKeyEnum> {
  const rows = (await manager.query(
    `SELECT flst.state_key::text AS state_key
     FROM feed_lifecycle_state fls
     INNER JOIN feed_lifecycle_state_type flst ON flst.id = fls.feed_lifecycle_state_type_id
     WHERE fls.feed_id = $1`,
    [feedId]
  )) as { state_key: string }[];

  if (rows.length === 0) {
    return FeedLifecycleStateKeyEnum.Active;
  }

  const key = rows[0]?.state_key;
  if (
    key === FeedLifecycleStateKeyEnum.Active ||
    key === FeedLifecycleStateKeyEnum.PendingArchive ||
    key === FeedLifecycleStateKeyEnum.Archived ||
    key === FeedLifecycleStateKeyEnum.Takedown
  ) {
    return key;
  }

  return FeedLifecycleStateKeyEnum.Active;
}

async function readActiveConditionKeysFromDb(
  manager: EntityManager,
  feedId: number
): Promise<FeedConditionTypeKeyEnum[]> {
  const rows = (await manager.query(
    `SELECT fct.condition_key::text AS condition_key
     FROM feed_condition fc
     INNER JOIN feed_condition_type fct ON fct.id = fc.feed_condition_type_id
     WHERE fc.feed_id = $1 AND fc.is_active = true`,
    [feedId]
  )) as { condition_key: string }[];

  const allowed = new Set<string>(Object.values(FeedConditionTypeKeyEnum));
  return rows
    .map((r) => r.condition_key)
    .filter((k): k is FeedConditionTypeKeyEnum => allowed.has(k))
    .map((k) => k as FeedConditionTypeKeyEnum);
}

async function upsertLifecycleRow(
  manager: EntityManager,
  feedId: number,
  adminAccountId: number,
  toKey: FeedLifecycleStateKeyEnum,
  reasonKey: string | null,
  note: string | null
): Promise<void> {
  const typeRows = (await manager.query(
    `SELECT id FROM feed_lifecycle_state_type WHERE state_key::text = $1::text`,
    [toKey]
  )) as { id: number }[];
  if (typeRows.length === 0) {
    throw new Error(`Unknown lifecycle state_key: ${toKey}`);
  }

  await manager.query(
    `INSERT INTO feed_lifecycle_state (
       feed_id,
       feed_lifecycle_state_type_id,
       reason_key,
       note,
       updated_by_source,
       updated_by_admin_id,
       created_at,
       updated_at
     )
     SELECT $1, flst.id, $2, $3, $4, $5, NOW(), NOW()
     FROM feed_lifecycle_state_type flst
     WHERE flst.state_key::text = $6::text
     ON CONFLICT (feed_id)
     DO UPDATE SET
       feed_lifecycle_state_type_id = EXCLUDED.feed_lifecycle_state_type_id,
       reason_key = EXCLUDED.reason_key,
       note = EXCLUDED.note,
       updated_by_source = EXCLUDED.updated_by_source,
       updated_by_admin_id = EXCLUDED.updated_by_admin_id,
       updated_at = NOW()`,
    [feedId, reasonKey, note, FeedLifecycleUpdateSourceEnum.Admin, adminAccountId, toKey]
  );
}

async function upsertConditionsForKeys(
  manager: EntityManager,
  feedId: number,
  desiredActive: ReadonlySet<string>,
  takedownConditionNote: string | null
): Promise<void> {
  for (const conditionKey of MANAGEABLE_CONDITION_KEYS) {
    const isActive = desiredActive.has(conditionKey);
    const noteForRow =
      conditionKey === FeedConditionTypeKeyEnum.TakedownActive && takedownConditionNote !== null
        ? takedownConditionNote
        : null;

    await manager.query(
      `INSERT INTO feed_condition (feed_id, feed_condition_type_id, is_active, source, note)
       SELECT $1, fct.id, $2, 'admin', $3
       FROM feed_condition_type fct
       WHERE fct.condition_key::text = $4::text
       ON CONFLICT (feed_id, feed_condition_type_id)
       DO UPDATE SET
         is_active = EXCLUDED.is_active,
         source = EXCLUDED.source,
         note = CASE
           WHEN EXCLUDED.note IS NOT NULL THEN EXCLUDED.note
           ELSE feed_condition.note
         END`,
      [feedId, isActive, noteForRow, conditionKey]
    );
  }
}

async function upsertPolicyRow(
  manager: EntityManager,
  feedId: number,
  parseAllowed: boolean,
  publicVisible: boolean,
  addAllowed: boolean,
  primaryBlockReason: FeedPolicyReasonEnum | null
): Promise<void> {
  await manager.query(
    `INSERT INTO feed_policy (
       feed_id,
       parse_allowed,
       public_visible,
       add_allowed,
       primary_block_reason,
       last_policy_refresh_at,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5::varchar, NOW(), NOW(), NOW())
     ON CONFLICT (feed_id)
     DO UPDATE SET
       parse_allowed = EXCLUDED.parse_allowed,
       public_visible = EXCLUDED.public_visible,
       add_allowed = EXCLUDED.add_allowed,
       primary_block_reason = EXCLUDED.primary_block_reason,
       last_policy_refresh_at = EXCLUDED.last_policy_refresh_at,
       updated_at = NOW()`,
    [feedId, parseAllowed, publicVisible, addAllowed, primaryBlockReason]
  );
}

async function upsertPolicyOverridePartial(
  manager: EntityManager,
  feedId: number,
  adminAccountId: number,
  overrides: {
    parse_allowed_override?: boolean | null;
    public_visible_override?: boolean | null;
    add_allowed_override?: boolean | null;
  }
): Promise<void> {
  await manager.query(
    `INSERT INTO feed_policy_override (
       feed_id,
       parse_allowed_override,
       public_visible_override,
       add_allowed_override,
       updated_by_admin_id,
       created_at,
       updated_at
     )
     VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
     ON CONFLICT (feed_id)
     DO UPDATE SET
       parse_allowed_override = EXCLUDED.parse_allowed_override,
       public_visible_override = EXCLUDED.public_visible_override,
       add_allowed_override = EXCLUDED.add_allowed_override,
       updated_by_admin_id = EXCLUDED.updated_by_admin_id,
       updated_at = NOW()`,
    [
      feedId,
      overrides.parse_allowed_override ?? null,
      overrides.public_visible_override ?? null,
      overrides.add_allowed_override ?? null,
      adminAccountId,
    ]
  );
}

async function readPolicyOverrideRow(
  manager: EntityManager,
  feedId: number
): Promise<{
  parse_allowed_override: boolean | null;
  public_visible_override: boolean | null;
  add_allowed_override: boolean | null;
} | null> {
  const rows = (await manager.query(
    `SELECT parse_allowed_override, public_visible_override, add_allowed_override
     FROM feed_policy_override WHERE feed_id = $1`,
    [feedId]
  )) as {
    parse_allowed_override: boolean | null;
    public_visible_override: boolean | null;
    add_allowed_override: boolean | null;
  }[];
  return rows[0] ?? null;
}

function mergeOverridesIntoEffective(
  computed: ReturnType<typeof computeEffectivePolicyFromConditionKeys>,
  overrideRow: {
    parse_allowed_override: boolean | null;
    public_visible_override: boolean | null;
    add_allowed_override: boolean | null;
  } | null
): { parseAllowed: boolean; publicVisible: boolean; addAllowed: boolean } {
  let parseAllowed = computed.parseAllowed;
  let publicVisible = computed.publicVisible;
  let addAllowed = computed.addAllowed;

  if (
    overrideRow?.parse_allowed_override !== null &&
    overrideRow?.parse_allowed_override !== undefined
  ) {
    parseAllowed = overrideRow.parse_allowed_override;
  }
  if (
    overrideRow?.public_visible_override !== null &&
    overrideRow?.public_visible_override !== undefined
  ) {
    publicVisible = overrideRow.public_visible_override;
  }
  if (
    overrideRow?.add_allowed_override !== null &&
    overrideRow?.add_allowed_override !== undefined
  ) {
    addAllowed = overrideRow.add_allowed_override;
  }

  return { parseAllowed, publicVisible, addAllowed };
}

export async function updateFeedOperationsPolicyState(
  feedId: number,
  adminAccountId: number,
  params: UpdateFeedOperationsPolicyStateParams
): Promise<void> {
  await AppDbDataSourceReadWrite.manager.transaction(async (manager) => {
    const currentLifecycle = await readCurrentLifecycleKey(manager, feedId);

    if (params.lifecycleStateKey !== undefined) {
      assertLifecycleTransitionAllowed(currentLifecycle, params.lifecycleStateKey, {
        explicitManagementOverride: true,
      });
    }

    const feedNumericParts: string[] = [];
    const feedNumericValues: unknown[] = [];
    let placeholder = 1;
    if (params.spamItemLimitOverride !== undefined) {
      feedNumericParts.push(`spam_item_limit_override = $${placeholder}`);
      placeholder += 1;
      feedNumericValues.push(params.spamItemLimitOverride);
    }
    if (params.maxResponseBodyBytesOverride !== undefined) {
      feedNumericParts.push(`max_response_body_bytes_override = $${placeholder}`);
      placeholder += 1;
      feedNumericValues.push(params.maxResponseBodyBytesOverride);
    }
    if (feedNumericParts.length > 0) {
      feedNumericValues.push(feedId);
      await manager.query(
        `UPDATE feed SET ${feedNumericParts.join(', ')} WHERE id = $${placeholder}`,
        feedNumericValues
      );
    }

    let targetLifecycle = currentLifecycle;
    if (params.lifecycleStateKey !== undefined) {
      targetLifecycle = params.lifecycleStateKey;
      const existingLife = (await manager.query(
        `SELECT reason_key, note FROM feed_lifecycle_state WHERE feed_id = $1`,
        [feedId]
      )) as { reason_key: string | null; note: string | null }[];

      const nextReasonKey =
        params.lifecycleReasonKey !== undefined
          ? params.lifecycleReasonKey
          : (existingLife[0]?.reason_key ?? null);
      const nextLifeNote =
        params.transitionNote !== undefined
          ? params.transitionNote
          : (existingLife[0]?.note ?? null);

      await upsertLifecycleRow(
        manager,
        feedId,
        adminAccountId,
        params.lifecycleStateKey,
        nextReasonKey,
        nextLifeNote
      );
    }

    const transitioningToTakedown =
      params.lifecycleStateKey === FeedLifecycleStateKeyEnum.Takedown &&
      currentLifecycle !== FeedLifecycleStateKeyEnum.Takedown;

    let takedownNote: string | null = null;
    if (
      params.lifecycleStateKey === FeedLifecycleStateKeyEnum.Takedown ||
      targetLifecycle === FeedLifecycleStateKeyEnum.Takedown
    ) {
      takedownNote =
        params.conditionNote !== null && params.conditionNote !== undefined
          ? params.conditionNote.trim() || null
          : null;
    }

    const transitional = params.takedownTransitional === true;

    if (params.activeConditionKeys !== undefined) {
      let keysForConditions = [...params.activeConditionKeys];
      if (
        targetLifecycle === FeedLifecycleStateKeyEnum.Takedown &&
        !transitional &&
        !keysForConditions.includes(FeedConditionTypeKeyEnum.TakedownActive)
      ) {
        keysForConditions = [...keysForConditions, FeedConditionTypeKeyEnum.TakedownActive];
      }

      const desired = new Set(keysForConditions.map((k) => String(k)));
      await upsertConditionsForKeys(manager, feedId, desired, takedownNote);
    } else if (transitioningToTakedown && !transitional) {
      let keysForConditions = await readActiveConditionKeysFromDb(manager, feedId);
      if (!keysForConditions.includes(FeedConditionTypeKeyEnum.TakedownActive)) {
        keysForConditions = [...keysForConditions, FeedConditionTypeKeyEnum.TakedownActive];
      }
      const desired = new Set(keysForConditions.map((k) => String(k)));
      await upsertConditionsForKeys(manager, feedId, desired, takedownNote);
    }

    if (params.policyOverrides !== undefined && params.policyOverrides !== null) {
      await upsertPolicyOverridePartial(manager, feedId, adminAccountId, params.policyOverrides);
    }

    const activeKeysAfter = await readActiveConditionKeysFromDb(manager, feedId);
    const lifecycleAfter = await readCurrentLifecycleKey(manager, feedId);

    const touchedLifecycleOrConditions =
      params.lifecycleStateKey !== undefined || params.activeConditionKeys !== undefined;

    if (
      touchedLifecycleOrConditions &&
      lifecycleAfter === FeedLifecycleStateKeyEnum.Takedown &&
      params.takedownTransitional !== true &&
      !activeKeysAfter.includes(FeedConditionTypeKeyEnum.TakedownActive)
    ) {
      throw new Error(
        'Takedown lifecycle requires takedown_active unless takedown_transitional is true'
      );
    }

    const computed = computeEffectivePolicyFromConditionKeys(activeKeysAfter);
    const overrideRow = await readPolicyOverrideRow(manager, feedId);
    const merged = mergeOverridesIntoEffective(computed, overrideRow);
    applyLifecycleConstraintsToEffectiveFlags(lifecycleAfter, merged);

    await upsertPolicyRow(
      manager,
      feedId,
      merged.parseAllowed,
      merged.publicVisible,
      merged.addAllowed,
      computed.primaryBlockReason
    );
  });
}
