import { config } from '@mgmt-api/config/index.js';
import { ensureAuthenticated } from '@mgmt-api/lib/auth/index.js';
import { requireCrud } from '@mgmt-api/lib/authz/requireCrud.js';
import { AuditLogService } from '@mgmt-api/lib/database/auditLog.js';
import {
  assertFlagStatusIdExists,
  assertFlagStatusReasonIdExists,
  FEED_FLAG_STATUS_TAKEDOWN_ID,
  findFeedByInternalId,
  findFeedByPodcastIndexId,
  findFeedByUrl,
  getFeedRowSnapshotById,
  listFeedFlagStatusOptions,
  listFeedFlagStatusReasonOptions,
  updateFeedFlagStatusInDb,
} from '@mgmt-api/lib/feed/feedFlagStatusAppDb.js';
import express from 'express';
import Joi from 'joi';

const router = express.Router();
const baseUrl = `${config.api.prefix}${config.api.version}`;
const auditLog = new AuditLogService();

const REASON_NOTE_MAX = 10000;

function getRequestId(req: express.Request): string {
  return (
    (req.headers['x-request-id'] as string) ||
    (req as express.Request & { id?: string }).id ||
    'unknown'
  );
}

const applyBodySchema = Joi.object({
  feed_id: Joi.number().integer().positive().required(),
  feed_flag_status_id: Joi.number().integer().positive().required(),
  feed_flag_status_reason_id: Joi.number().integer().positive().allow(null).optional(),
  feed_flag_status_reason_note: Joi.string().max(REASON_NOTE_MAX).allow(null, '').optional(),
}).required();

// --- Routes ---

router.get(
  `${baseUrl}/feed-operations/options`,
  ensureAuthenticated,
  requireCrud('feeds', 'read'),
  async (_req, res) => {
    try {
      const [statuses, reasons] = await Promise.all([
        listFeedFlagStatusOptions(),
        listFeedFlagStatusReasonOptions(),
      ]);
      res.json({ feed_flag_statuses: statuses, feed_flag_status_reasons: reasons });
    } catch (err) {
      console.error('[feed-operations/options]', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

router.get(
  `${baseUrl}/feed-operations/lookup`,
  ensureAuthenticated,
  requireCrud('feeds', 'read'),
  async (req, res) => {
    try {
      const podcastRaw = req.query.podcast_index_id;
      const feedIdRaw = req.query.feed_id;
      const urlRaw = req.query.url;

      const nPresent =
        (podcastRaw !== undefined && String(podcastRaw).length > 0 ? 1 : 0) +
        (feedIdRaw !== undefined && String(feedIdRaw).length > 0 ? 1 : 0) +
        (urlRaw !== undefined && String(urlRaw).length > 0 ? 1 : 0);

      if (nPresent !== 1) {
        res
          .status(400)
          .json({ message: 'Provide exactly one of: podcast_index_id, feed_id, or url' });
        return;
      }

      if (podcastRaw !== undefined && String(podcastRaw).length > 0) {
        const podcast_index_id = parseInt(String(podcastRaw), 10);
        if (Number.isNaN(podcast_index_id) || podcast_index_id <= 0) {
          res.status(400).json({ message: 'Invalid podcast_index_id' });
          return;
        }
        const row = await findFeedByPodcastIndexId(podcast_index_id);
        if (!row) {
          res.status(404).json({ message: 'Feed not found' });
          return;
        }
        res.json({ feed: row });
        return;
      }

      if (feedIdRaw !== undefined && String(feedIdRaw).length > 0) {
        const feed_id = parseInt(String(feedIdRaw), 10);
        if (Number.isNaN(feed_id) || feed_id <= 0) {
          res.status(400).json({ message: 'Invalid feed_id' });
          return;
        }
        const row = await findFeedByInternalId(feed_id);
        if (!row) {
          res.status(404).json({ message: 'Feed not found' });
          return;
        }
        res.json({ feed: row });
        return;
      }

      const url = String(urlRaw).trim();
      if (!url) {
        res.status(400).json({ message: 'url is required when using url lookup' });
        return;
      }
      const row = await findFeedByUrl(url);
      if (!row) {
        res.status(404).json({ message: 'Feed not found' });
        return;
      }
      res.json({ feed: row });
    } catch (err) {
      console.error('[feed-operations/lookup]', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

router.post(
  `${baseUrl}/feed-operations/flag-status`,
  ensureAuthenticated,
  requireCrud('feeds', 'update'),
  async (req, res) => {
    const { error, value } = applyBodySchema.validate(req.body);
    if (error) {
      res.status(400).json({ message: error.message });
      return;
    }

    const adminId = req.user?.id;
    if (!adminId) {
      res.status(401).json({ message: 'Authentication required' });
      return;
    }

    try {
      const reasonId =
        value.feed_flag_status_reason_id === undefined ? null : value.feed_flag_status_reason_id;
      const noteRaw = value.feed_flag_status_reason_note;
      const note =
        noteRaw === undefined || noteRaw === null || noteRaw === ''
          ? null
          : String(noteRaw).trim() || null;

      const statusId = value.feed_flag_status_id as number;

      if (!(await assertFlagStatusIdExists(statusId))) {
        res.status(400).json({ message: 'Invalid feed_flag_status_id' });
        return;
      }

      if (statusId === FEED_FLAG_STATUS_TAKEDOWN_ID && reasonId === null) {
        res.status(400).json({ message: 'feed_flag_status_reason_id is required for takedown' });
        return;
      }

      if (reasonId !== null && !(await assertFlagStatusReasonIdExists(reasonId))) {
        res.status(400).json({ message: 'Invalid feed_flag_status_reason_id' });
        return;
      }

      const before = await getFeedRowSnapshotById(value.feed_id);
      if (!before) {
        res.status(404).json({ message: 'Feed not found' });
        return;
      }

      await updateFeedFlagStatusInDb(value.feed_id, statusId, reasonId, note);

      const after = await getFeedRowSnapshotById(value.feed_id);
      if (!after) {
        res.status(500).json({ message: 'Failed to read feed after update' });
        return;
      }

      await auditLog.record({
        adminAccountId: adminId,
        operation: 'update',
        tableName: 'feed',
        rowId: value.feed_id,
        beforeSnapshot: before,
        afterSnapshot: after,
        requestId: getRequestId(req),
      });

      res.json({ feed: after });
    } catch (err) {
      console.error('[feed-operations/flag-status]', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

export const feedFlagStatusRouter = router;
