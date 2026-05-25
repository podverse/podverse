import { config } from '@management-api/config/index.js';
import { ensureAuthenticated } from '@management-api/lib/auth/index.js';
import { requireCrud } from '@management-api/lib/authz/requireCrud.js';
import { getParamRequired } from '@management-api/lib/params.js';
import { AppDbDataSourceRead } from '@management-api/orm/db/appDb.js';
import express from 'express';
import Joi from 'joi';

const router = express.Router();

const VALID_ENTITY_TYPES = ['channel', 'item', 'clip', 'playlist', 'account'] as const;
type EntityType = (typeof VALID_ENTITY_TYPES)[number];

const STATS_RANGE_COLUMNS: Record<string, string> = {
  day: 'day_current_count',
  '7day':
    'day_current_count + day_1_count + day_2_count + day_3_count + day_4_count + day_5_count + day_6_count',
  '30day': 'month_current_count',
  '1year': 'month_current_count + COALESCE(month_1_count, 0)',
  'all-time': 'all_time_count',
};

const ENTITY_CONFIG: Record<
  EntityType,
  { fkColumn: string; titleColumn: string; titleTable: string; titleJoin: string }
> = {
  channel: {
    fkColumn: 'channel_id',
    titleColumn: 'c.title',
    titleTable: 'channel c ON c.id = sa.channel_id',
    titleJoin: 'channel',
  },
  item: {
    fkColumn: 'item_id',
    titleColumn: 'i.title',
    titleTable: 'item i ON i.id = sa.item_id',
    titleJoin: 'item',
  },
  clip: {
    fkColumn: 'clip_id',
    titleColumn: 'cl.title',
    titleTable: 'clip cl ON cl.id = sa.clip_id',
    titleJoin: 'clip',
  },
  playlist: {
    fkColumn: 'playlist_id',
    titleColumn: 'p.title',
    titleTable: 'playlist p ON p.id = sa.playlist_id',
    titleJoin: 'playlist',
  },
  account: {
    fkColumn: 'tracked_account_id',
    titleColumn: 'ap.display_name',
    titleTable:
      'account a ON a.id = sa.tracked_account_id LEFT JOIN account_profile ap ON ap.account_id = a.id',
    titleJoin: 'account',
  },
};

const topQuerySchema = Joi.object({
  range: Joi.string().valid('day', '7day', '30day', '1year', 'all-time').default('all-time'),
  limit: Joi.number().integer().min(1).max(100).default(25),
  page: Joi.number().integer().min(1).default(1),
});

const searchQuerySchema = Joi.object({
  q: Joi.string().min(1).max(200).required(),
  range: Joi.string().valid('day', '7day', '30day', '1year', 'all-time').default('all-time'),
  limit: Joi.number().integer().min(1).max(100).default(25),
  page: Joi.number().integer().min(1).default(1),
});

function validateEntityType(entityType: string): EntityType | null {
  if (VALID_ENTITY_TYPES.includes(entityType as EntityType)) {
    return entityType as EntityType;
  }
  return null;
}

router.get(
  '/:entityType/top',
  ensureAuthenticated,
  requireCrud('stats', 'read'),
  async (req, res) => {
    try {
      const entityTypeParam = getParamRequired(req, 'entityType');
      const entityType = validateEntityType(entityTypeParam);
      if (!entityType) {
        res.status(400).json({
          message: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
        });
        return;
      }

      const { error, value } = topQuerySchema.validate(req.query);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }

      const ec = ENTITY_CONFIG[entityType];
      const sortColumn = STATS_RANGE_COLUMNS[value.range];
      const offset = (value.page - 1) * value.limit;

      const countResult = await AppDbDataSourceRead.query(
        `SELECT COUNT(*)::int AS total FROM stats_aggregated_${entityType} sa`
      );
      const total = countResult[0]?.total ?? 0;

      const rows = await AppDbDataSourceRead.query(
        `SELECT
          sa.id,
          sa.${ec.fkColumn},
          ${ec.titleColumn} AS title,
          sa.day_current_count,
          sa.day_1_count,
          sa.day_2_count,
          sa.day_3_count,
          sa.day_4_count,
          sa.day_5_count,
          sa.day_6_count,
          sa.day_7_count,
          sa.day_8_count,
          sa.week_current_count,
          sa.week_1_count,
          sa.week_2_count,
          sa.week_3_count,
          sa.week_4_count,
          sa.month_current_count,
          sa.month_1_count,
          sa.all_time_count,
          (${sortColumn}) AS range_count
        FROM stats_aggregated_${entityType} sa
        LEFT JOIN ${ec.titleTable}
        ORDER BY range_count DESC NULLS LAST
        LIMIT $1 OFFSET $2`,
        [value.limit, offset]
      );

      res.json({ rows, total, page: value.page, pageSize: value.limit });
    } catch (err) {
      console.error('[stats/:entityType/top]', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

router.get(
  '/:entityType/search',
  ensureAuthenticated,
  requireCrud('stats', 'read'),
  async (req, res) => {
    try {
      const entityTypeParam = getParamRequired(req, 'entityType');
      const entityType = validateEntityType(entityTypeParam);
      if (!entityType) {
        res.status(400).json({
          message: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
        });
        return;
      }

      const { error, value } = searchQuerySchema.validate(req.query);
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }

      const ec = ENTITY_CONFIG[entityType];
      const sortColumn = STATS_RANGE_COLUMNS[value.range];
      const offset = (value.page - 1) * value.limit;

      const searchPattern = `%${value.q}%`;

      const rows = await AppDbDataSourceRead.query(
        `SELECT
          sa.id,
          sa.${ec.fkColumn},
          ${ec.titleColumn} AS title,
          sa.day_current_count,
          sa.day_1_count,
          sa.day_2_count,
          sa.day_3_count,
          sa.day_4_count,
          sa.day_5_count,
          sa.day_6_count,
          sa.day_7_count,
          sa.day_8_count,
          sa.week_current_count,
          sa.week_1_count,
          sa.week_2_count,
          sa.week_3_count,
          sa.week_4_count,
          sa.month_current_count,
          sa.month_1_count,
          sa.all_time_count,
          (${sortColumn}) AS range_count
        FROM stats_aggregated_${entityType} sa
        LEFT JOIN ${ec.titleTable}
        WHERE ${ec.titleColumn} ILIKE $1
        ORDER BY range_count DESC NULLS LAST
        LIMIT $2 OFFSET $3`,
        [searchPattern, value.limit, offset]
      );

      const countResult = await AppDbDataSourceRead.query(
        `SELECT COUNT(*)::int AS total
        FROM stats_aggregated_${entityType} sa
        LEFT JOIN ${ec.titleTable}
        WHERE ${ec.titleColumn} ILIKE $1`,
        [searchPattern]
      );
      const total = countResult[0]?.total ?? 0;

      res.json({ rows, total, page: value.page, pageSize: value.limit });
    } catch (err) {
      console.error('[stats/:entityType/search]', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

router.get(
  '/:entityType/:id',
  ensureAuthenticated,
  requireCrud('stats', 'read'),
  async (req, res) => {
    try {
      const entityTypeParam = getParamRequired(req, 'entityType');
      const entityType = validateEntityType(entityTypeParam);
      if (!entityType) {
        res.status(400).json({
          message: `Invalid entity type. Must be one of: ${VALID_ENTITY_TYPES.join(', ')}`,
        });
        return;
      }

      const idParam = getParamRequired(req, 'id');
      const id = parseInt(idParam, 10);
      if (Number.isNaN(id) || id <= 0) {
        res.status(400).json({ message: 'Invalid id' });
        return;
      }

      const ec = ENTITY_CONFIG[entityType];

      const rows = await AppDbDataSourceRead.query(
        `SELECT
          sa.id,
          sa.${ec.fkColumn},
          ${ec.titleColumn} AS title,
          sa.day_current_count,
          sa.day_1_count,
          sa.day_2_count,
          sa.day_3_count,
          sa.day_4_count,
          sa.day_5_count,
          sa.day_6_count,
          sa.day_7_count,
          sa.day_8_count,
          sa.week_current_count,
          sa.week_1_count,
          sa.week_2_count,
          sa.week_3_count,
          sa.week_4_count,
          sa.month_current_count,
          sa.month_1_count,
          sa.all_time_count
        FROM stats_aggregated_${entityType} sa
        LEFT JOIN ${ec.titleTable}
        WHERE sa.id = $1
        LIMIT 1`,
        [id]
      );

      if (rows.length === 0) {
        res.status(404).json({ message: 'Stats record not found' });
        return;
      }

      res.json(rows[0]);
    } catch (err) {
      console.error('[stats/:entityType/:id]', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

const statsRoot = express.Router();
statsRoot.use(`${config.api.prefix}${config.api.version}/stats`, router);
export const statsRouter = statsRoot;
