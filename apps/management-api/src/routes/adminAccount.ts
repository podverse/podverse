import express from 'express';
import { ensureAuthenticated } from '@mgmt-api/lib/auth/index.js';
import { config } from '@mgmt-api/config/index.js';
import { AdminAccountService } from '@mgmt-api/orm/services/adminAccount.js';
import { getParamRequired } from '@mgmt-api/lib/params.js';

const router = express.Router();
const baseUrl = `${config.api.prefix}${config.api.version}`;

// Get admin account by id
router.get(`${baseUrl}/admin-account/:id`, ensureAuthenticated, async (req, res) => {
  try {
    const adminAccountService = new AdminAccountService();
    const idParam = getParamRequired(req, 'id');
    const id = parseInt(idParam, 10);

    if (isNaN(id)) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const adminAccount = await adminAccountService.get(id);

    if (!adminAccount) {
      res.status(404).json({ message: 'Admin account not found' });
      return;
    }

    res.json({
      id: adminAccount.id,
      id_text: adminAccount.id_text,
      created_at: adminAccount.created_at,
    });
  } catch (error) {
    console.error('Error getting admin account:', error);
    if (!res.headersSent) {
      res.status(500).json({ message: 'Internal server error' });
    }
    return;
  }
});

export const adminAccountRouter = router;
