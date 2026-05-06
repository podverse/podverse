import { config } from '@mgmt-api/config/index.js';
import { ensureAuthenticated } from '@mgmt-api/lib/auth/index.js';
import { requireCrud } from '@mgmt-api/lib/authz/requireCrud.js';
import { AuditLogService } from '@mgmt-api/lib/database/auditLog.js';
import type { UpdateFeedOperationsPolicyStateParams } from '@mgmt-api/lib/feed/feedFlagStatusAppDb.js';
import {
  assertTakedownReasonExists,
  findFeedByInternalId,
  findFeedByPodcastIndexId,
  findFeedByUrl,
  getFeedAuditSnapshotById,
  listConditionTypeOptions,
  listLifecycleStateOptions,
  listTakedownReasonOptions,
  updateFeedOperationsPolicyState,
} from '@mgmt-api/lib/feed/feedFlagStatusAppDb.js';
import {
  toConditionTypeEnums,
  toLifecycleStateEnum,
} from '@mgmt-api/lib/feed/feedOperationsEnums.js';
import { feedOperationsUpdatePolicyStateBodySchema } from '@mgmt-api/schemas/feedOperationsPolicy.js';
import express from 'express';

import { FeedLifecycleStateKeyEnum } from '@podverse/orm';

const router = express.Router();
const baseUrl = `${config.api.prefix}${config.api.version}`;
const auditLog = new AuditLogService();

function getRequestId(req: express.Request): string {
  const hdr = req.headers['x-request-id'];
  if (typeof hdr === 'string' && hdr.length > 0) {
    return hdr;
  }
  if ('id' in req) {
    const candidate = Reflect.get(req, 'id');
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate;
    }
  }
  return 'unknown';
}

router.get(
  `${baseUrl}/feed-operations/options`,
  ensureAuthenticated,
  requireCrud('feeds', 'read'),
  async (_req, res) => {
    try {
      const [lifecycle_states, condition_types, takedown_reasons] = await Promise.all([
        listLifecycleStateOptions(),
        listConditionTypeOptions(),
        listTakedownReasonOptions(),
      ]);
      res.json({ lifecycle_states, condition_types, takedown_reasons });
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
  `${baseUrl}/feed-operations/update-policy-state`,
  ensureAuthenticated,
  requireCrud('feeds', 'update'),
  async (req, res) => {
    const { error, value } = feedOperationsUpdatePolicyStateBodySchema.validate(req.body);
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
      const lifecycleKey = toLifecycleStateEnum(value.lifecycle_state_key);

      const reasonKeyTrimmed =
        value.lifecycle_reason_key === undefined ||
        value.lifecycle_reason_key === null ||
        value.lifecycle_reason_key === ''
          ? null
          : String(value.lifecycle_reason_key).trim() || null;

      const transitionNoteResolved =
        value.transition_note === undefined
          ? undefined
          : value.transition_note === null || value.transition_note === ''
            ? null
            : String(value.transition_note).trim() || null;

      if (lifecycleKey === FeedLifecycleStateKeyEnum.Takedown) {
        const hasTransitionDoc =
          transitionNoteResolved !== undefined &&
          transitionNoteResolved !== null &&
          transitionNoteResolved.length > 0;
        const hasReason = reasonKeyTrimmed !== null && reasonKeyTrimmed.length > 0;
        if (!hasTransitionDoc && !hasReason) {
          res.status(400).json({
            message:
              'Takedown requires transition_note and/or a predefined lifecycle_reason_key (from options)',
          });
          return;
        }
        if (reasonKeyTrimmed !== null && !(await assertTakedownReasonExists(reasonKeyTrimmed))) {
          res.status(400).json({ message: 'Invalid lifecycle_reason_key' });
          return;
        }
      }

      const activeKeysRaw =
        value.active_condition_keys !== undefined
          ? toConditionTypeEnums(value.active_condition_keys)
          : undefined;

      const before = await getFeedAuditSnapshotById(value.feed_id);
      if (!before) {
        res.status(404).json({ message: 'Feed not found' });
        return;
      }

      const payload: UpdateFeedOperationsPolicyStateParams = {};
      if (lifecycleKey !== undefined) {
        payload.lifecycleStateKey = lifecycleKey;
      }
      if (activeKeysRaw !== undefined) {
        payload.activeConditionKeys = activeKeysRaw;
      }
      if (value.lifecycle_reason_key !== undefined) {
        payload.lifecycleReasonKey = reasonKeyTrimmed;
      }
      if (value.transition_note !== undefined) {
        payload.transitionNote = transitionNoteResolved ?? null;
      }
      if (value.condition_note !== undefined) {
        payload.conditionNote =
          value.condition_note === null || value.condition_note === ''
            ? null
            : String(value.condition_note).trim() || null;
      }
      if (value.spam_item_limit_override !== undefined) {
        payload.spamItemLimitOverride = value.spam_item_limit_override;
      }
      if (value.max_response_body_bytes_override !== undefined) {
        payload.maxResponseBodyBytesOverride = value.max_response_body_bytes_override;
      }
      if (value.policy_overrides !== undefined) {
        payload.policyOverrides = value.policy_overrides ?? null;
      }
      if (value.takedown_transitional !== undefined) {
        payload.takedownTransitional = value.takedown_transitional;
      }

      await updateFeedOperationsPolicyState(value.feed_id, adminId, payload);

      const afterFeed = await findFeedByInternalId(value.feed_id);
      if (!afterFeed) {
        res.status(500).json({ message: 'Failed to read feed after update' });
        return;
      }

      const after = await getFeedAuditSnapshotById(value.feed_id);

      await auditLog.record({
        adminAccountId: adminId,
        operation: 'update',
        tableName: 'feed',
        rowId: value.feed_id,
        beforeSnapshot: before,
        afterSnapshot: after ?? { ...afterFeed },
        requestId: getRequestId(req),
      });

      res.json({ feed: afterFeed });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('Disallowed lifecycle transition')) {
        res.status(400).json({ message });
        return;
      }
      if (message.includes('Takedown lifecycle requires takedown_active')) {
        res.status(400).json({ message });
        return;
      }
      console.error('[feed-operations/update-policy-state]', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  }
);

export const feedFlagStatusRouter = router;
