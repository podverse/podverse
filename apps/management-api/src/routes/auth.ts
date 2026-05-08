import { config } from '@mgmt-api/config/index.js';
import { authenticate, ensureAuthenticated, logout } from '@mgmt-api/lib/auth/index.js';
import express from 'express';

const router = express.Router();

router.post('/login', authenticate);

router.post('/logout', logout);

router.get('/me', ensureAuthenticated, (req, res) => {
  const admin = req.user;
  if (!admin) {
    res.status(401).json({ message: 'Unauthorized' });
    return;
  }

  res.json({
    id: admin.id,
    id_text: admin.id_text,
    email: admin.email,
    role: admin.role,
    permissions: admin.permissions,
  });
});

const authRoot = express.Router();
authRoot.use(`${config.api.prefix}${config.api.version}/auth`, router);
export const authRouter = authRoot;
