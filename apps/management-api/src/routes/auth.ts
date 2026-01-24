import express from 'express';
import { authenticate, logout, ensureAuthenticated } from '@mgmt-api/lib/auth';
import { config } from '@mgmt-api/config';
import { AdminAccountService } from '@mgmt-api/orm/services/adminAccount';

const router = express.Router();
const baseUrl = `${config.api.prefix}${config.api.version}`;

// Login
router.post(`${baseUrl}/auth/login`, authenticate);

// Logout
router.post(`${baseUrl}/auth/logout`, logout);

// Get current user
router.get(`${baseUrl}/auth/me`, ensureAuthenticated, async (req, res) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const adminAccountService = new AdminAccountService();
    const adminAccount = await adminAccountService.get(userId);
    
    if (!adminAccount) {
      return res.status(404).json({ message: 'Admin account not found' });
    }

    return res.json({
      id: adminAccount.id,
      id_text: adminAccount.id_text,
      created_at: adminAccount.created_at,
    });
  } catch (error) {
    console.error('Error getting current user:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

export const authRouter = router;
