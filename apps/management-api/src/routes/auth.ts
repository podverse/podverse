import { config } from '@mgmt-api/config/index.js';
import { authenticate, ensureAuthenticated, logout } from '@mgmt-api/lib/auth/index.js';
import express from 'express';

const router = express.Router();
const baseUrl = `${config.api.prefix}${config.api.version}`;

// Login
router.post(`${baseUrl}/auth/login`, authenticate);

// Logout
router.post(`${baseUrl}/auth/logout`, logout);

// Get current user
router.get(`${baseUrl}/auth/me`, ensureAuthenticated, (req, res) => {
  const admin = req.user;
  if (!admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  res.json({
    id: admin.id,
    id_text: admin.id_text,
    role: admin.role,
    permissions: admin.permissions,
  });
});

export const authRouter = router;
