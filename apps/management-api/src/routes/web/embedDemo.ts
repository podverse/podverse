import { ensureAuthenticated } from '@management-api/lib/auth/index.js';
import { requireCrud } from '@management-api/lib/authz/requireCrud.js';
import { AuditLogService } from '@management-api/lib/database/auditLog.js';
import { getAuditRequestId } from '@management-api/lib/getAuditRequestId.js';
import { getParamRequired } from '@management-api/lib/params.js';
import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@management-api/orm/db/appDb.js';
import { upsertEmbedDemoShowcaseBodySchema } from '@management-api/schemas/embedDemo.js';
import express from 'express';

import { isEmbedDemoShowcaseId } from '@podverse/helpers';
import { EmbedDemoConfigService, EmbedDemoConfigValidationError } from '@podverse/orm';

export const embedDemoRouter = express.Router();

const auditLog = new AuditLogService();
const embedDemoConfigService = new EmbedDemoConfigService({
  dataSourceRead: AppDbDataSourceRead,
  dataSourceReadWrite: AppDbDataSourceReadWrite,
});

embedDemoRouter.get(
  '/showcase',
  ensureAuthenticated,
  requireCrud('embed_demo', 'read'),
  async (_req, res, next) => {
    try {
      const data = await embedDemoConfigService.getAdminShowcaseSlots();
      res.json({ data });
    } catch (error) {
      next(error);
    }
  }
);

embedDemoRouter.put(
  '/showcase/:showcaseId',
  ensureAuthenticated,
  requireCrud('embed_demo', 'update'),
  async (req, res, next) => {
    try {
      const showcaseId = getParamRequired(req, 'showcaseId');
      if (!isEmbedDemoShowcaseId(showcaseId)) {
        res.status(400).json({ message: `Unknown showcase id: ${showcaseId}` });
        return;
      }

      const { error, value } = upsertEmbedDemoShowcaseBodySchema.validate(req.body, {
        abortEarly: false,
        convert: true,
      });
      if (error) {
        res.status(400).json({ message: error.message });
        return;
      }

      const adminId = req.user?.id;
      if (adminId === undefined) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const saved = await embedDemoConfigService.upsertShowcase(showcaseId, value.resourceIdText);

      await auditLog.record({
        adminAccountId: adminId,
        operation: 'update',
        tableName: 'embed_demo_showcase',
        rowId: 0,
        requestId: getAuditRequestId(req),
        afterSnapshot: {
          showcase_id: saved.showcase_id,
          resource_id_text: saved.resource_id_text,
        },
      });

      res.json({
        data: {
          showcaseId: saved.showcase_id,
          resourceIdText: saved.resource_id_text,
        },
      });
    } catch (err) {
      if (err instanceof EmbedDemoConfigValidationError) {
        res.status(400).json({ message: err.message });
        return;
      }
      next(err);
    }
  }
);

embedDemoRouter.delete(
  '/showcase/:showcaseId',
  ensureAuthenticated,
  requireCrud('embed_demo', 'update'),
  async (req, res, next) => {
    try {
      const showcaseId = getParamRequired(req, 'showcaseId');
      if (!isEmbedDemoShowcaseId(showcaseId)) {
        res.status(400).json({ message: `Unknown showcase id: ${showcaseId}` });
        return;
      }

      const adminId = req.user?.id;
      if (adminId === undefined) {
        res.status(401).json({ message: 'Authentication required' });
        return;
      }

      const deleted = await embedDemoConfigService.deleteShowcase(showcaseId);
      if (!deleted) {
        res.status(404).json({ message: 'Showcase slot is not configured' });
        return;
      }

      await auditLog.record({
        adminAccountId: adminId,
        operation: 'delete',
        tableName: 'embed_demo_showcase',
        rowId: 0,
        requestId: getAuditRequestId(req),
        beforeSnapshot: { showcase_id: showcaseId },
      });

      res.status(204).send();
    } catch (err) {
      if (err instanceof EmbedDemoConfigValidationError) {
        res.status(400).json({ message: err.message });
        return;
      }
      next(err);
    }
  }
);
