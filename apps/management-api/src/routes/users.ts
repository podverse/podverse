import { config } from '@management-api/config/index.js';
import { ensureAuthenticated } from '@management-api/lib/auth/index.js';
import { requireSuperuser } from '@management-api/lib/authz/requireSuperuser.js';
import { AppDbDataSourceRead, AppDbDataSourceReadWrite } from '@management-api/orm/db/appDb.js';
import express from 'express';
import { v4 as uuidv4 } from 'uuid';

import {
  ACCOUNT_SIGNUP_MODE_ADMIN_ONLY_EMAIL,
  ACCOUNT_SIGNUP_MODE_USER_SIGNUP_EMAIL,
  AccountMembershipEnum,
  type AccountSignupMode,
  type BillingCadence,
  extendMembershipPeriodByCadence,
  getAccountSignupModeCapabilities,
  type PremiumBillingCadence,
  SharableStatusEnum,
} from '@podverse/helpers';
import { validateEmail, validatePassword, validateUsername } from '@podverse/helpers-validation';
import { BillingPriceCatalogService, generateRandomIdText, hashPassword } from '@podverse/orm';

const router = express.Router();
const billingPriceCatalogService = new BillingPriceCatalogService({
  dataSourceRead: AppDbDataSourceRead,
  dataSourceReadWrite: AppDbDataSourceReadWrite,
});

const DEFAULT_PAGE_LIMIT = 25;
const MAX_PAGE_LIMIT = 100;

function parseIdParam(raw: string | string[] | undefined): number | null {
  if (!raw || Array.isArray(raw)) return null;
  const n = parseInt(raw, 10);
  return isNaN(n) ? null : n;
}

function getSetPasswordTtlMs(): number {
  return config.setUserPasswordExpiration * 1000;
}

function userRowToJson(row: Record<string, unknown>) {
  return {
    id: row.id,
    id_text: row.id_text,
    verified: row.verified,
    email: row.email ?? null,
    username: row.username ?? null,
    sharable_status_id: row.sharable_status_id,
    created_at: row.created_at,
    account_membership_id: row.account_membership_id ?? AccountMembershipEnum.Trial,
    membership_expires_at: row.membership_expires_at ?? null,
    allow_directory_add_by_rss: row.allow_directory_add_by_rss ?? null,
    max_add_by_rss_feeds: row.max_add_by_rss_feeds ?? null,
    max_manual_refreshes_per_hour: row.max_manual_refreshes_per_hour ?? null,
    track_stats: row.track_stats ?? null,
    allow_notifications: row.allow_notifications ?? null,
  };
}

// List users (paginated)
router.get('/', ensureAuthenticated, requireSuperuser, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(String(req.query.page ?? '1'), 10) || 1);
    const limit = Math.min(
      MAX_PAGE_LIMIT,
      Math.max(
        1,
        parseInt(String(req.query.limit ?? String(DEFAULT_PAGE_LIMIT)), 10) || DEFAULT_PAGE_LIMIT
      )
    );
    const offset = (page - 1) * limit;

    const searchRaw = req.query.search;
    const search = typeof searchRaw === 'string' ? searchRaw.trim() : undefined;

    let whereClause = '';
    const params: unknown[] = [];

    if (search) {
      whereClause = `WHERE LOWER(ac.email) LIKE LOWER($1) OR LOWER(ac.username) LIKE LOWER($1)`;
      params.push(`%${search.replace(/\\/g, '\\\\').replace(/%/g, '\\%').replace(/_/g, '\\_')}%`);
    }

    const countResult = await AppDbDataSourceRead.query(
      `SELECT COUNT(*)::int AS total FROM account a
       LEFT JOIN account_credentials ac ON ac.account_id = a.id
       LEFT JOIN account_membership_status ams ON ams.account_id = a.id
       ${whereClause}`,
      params
    );
    const total = countResult[0].total as number;
    const totalPages = Math.ceil(total / limit);

    const rows = await AppDbDataSourceRead.query(
      `SELECT a.id, a.id_text, a.verified, a.sharable_status_id, a.created_at,
              ac.email, ac.username,
              ams.account_membership_id, ams.membership_expires_at,
              ams.allow_directory_add_by_rss, ams.max_add_by_rss_feeds,
              ams.max_manual_refreshes_per_hour, ams.track_stats, ams.allow_notifications
       FROM account a
       LEFT JOIN account_credentials ac ON ac.account_id = a.id
       LEFT JOIN account_membership_status ams ON ams.account_id = a.id
       ${whereClause}
       ORDER BY a.id ASC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, limit, offset]
    );

    res.json({
      users: rows.map(userRowToJson),
      pagination: { page, limit, total, totalPages },
    });
  } catch (error) {
    next(error);
  }
});

// Get user by id
router.get('/:id', ensureAuthenticated, requireSuperuser, async (req, res, next) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const rows = await AppDbDataSourceRead.query(
      `SELECT a.id, a.id_text, a.verified, a.sharable_status_id, a.created_at,
                ac.email, ac.username,
                ams.account_membership_id, ams.membership_expires_at,
                ams.allow_directory_add_by_rss, ams.max_add_by_rss_feeds,
                ams.max_manual_refreshes_per_hour, ams.track_stats, ams.allow_notifications
         FROM account a
         LEFT JOIN account_credentials ac ON ac.account_id = a.id
         LEFT JOIN account_membership_status ams ON ams.account_id = a.id
         WHERE a.id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user: userRowToJson(rows[0]) });
  } catch (error) {
    next(error);
  }
});

// Create user
router.post('/', ensureAuthenticated, requireSuperuser, async (req, res, next) => {
  try {
    const {
      username,
      email,
      password,
      account_membership_id,
      membership_expires_at,
      allow_directory_add_by_rss,
      max_add_by_rss_feeds,
      max_manual_refreshes_per_hour,
      track_stats,
      allow_notifications,
      premium_billing_cadence,
    } = req.body as {
      username?: string;
      email?: string;
      password?: string;
      account_membership_id?: number;
      membership_expires_at?: string | null;
      allow_directory_add_by_rss?: boolean | null;
      max_add_by_rss_feeds?: number | null;
      max_manual_refreshes_per_hour?: number | null;
      track_stats?: boolean | null;
      allow_notifications?: boolean | null;
      premium_billing_cadence?: PremiumBillingCadence;
    };

    const mode = process.env.ACCOUNT_SIGNUP_MODE;
    const capabilities = getAccountSignupModeCapabilities(
      (mode || ACCOUNT_SIGNUP_MODE_ADMIN_ONLY_EMAIL) as AccountSignupMode
    );

    if (mode === ACCOUNT_SIGNUP_MODE_USER_SIGNUP_EMAIL) {
      res.status(400).json({
        message: 'User creation via management API is not available in user_signup_email mode',
      });
      return;
    }

    if (!username && !email) {
      res.status(400).json({ message: 'At least one of username or email is required' });
      return;
    }

    if (username && !validateUsername(username)) {
      res
        .status(400)
        .json({ message: 'Invalid username (3-32 chars, alphanumeric, underscore, dash)' });
      return;
    }

    if (email && !validateEmail(email)) {
      res.status(400).json({ message: 'Invalid email' });
      return;
    }

    if (password && !validatePassword(password)) {
      res.status(400).json({ message: 'Invalid password (min 8 chars)' });
      return;
    }

    if (
      account_membership_id !== undefined &&
      account_membership_id !== AccountMembershipEnum.Trial &&
      account_membership_id !== AccountMembershipEnum.Premium
    ) {
      res.status(400).json({ message: 'Invalid account_membership_id' });
      return;
    }

    if (membership_expires_at !== undefined && membership_expires_at !== null) {
      const parsedMembershipExpiresAt = new Date(membership_expires_at);
      if (Number.isNaN(parsedMembershipExpiresAt.getTime())) {
        res.status(400).json({ message: 'Invalid membership_expires_at' });
        return;
      }
    }

    const locale = process.env.DEFAULT_ACCOUNT_SETTINGS_LOCALE || 'en-US';

    const existingCheck = await AppDbDataSourceRead.query(
      `SELECT id FROM account_credentials WHERE email = $1 OR username = $2`,
      [email ?? null, username ?? null]
    );
    if (existingCheck.length > 0) {
      res.status(409).json({ message: 'Cannot create account. Account already exists.' });
      return;
    }

    const actualPassword = password ?? uuidv4();
    const saltedPassword = await hashPassword(actualPassword);
    const idText = generateRandomIdText();
    const isVerified = !!password;

    // 1. Insert into account table
    const accountResult = await AppDbDataSourceReadWrite.query(
      `INSERT INTO account (id_text, verified, sharable_status_id) VALUES ($1, $2, $3) RETURNING id`,
      [idText, isVerified, SharableStatusEnum.Private]
    );
    const accountId = accountResult[0].id as number;

    // 2. Insert into account_credentials
    await AppDbDataSourceReadWrite.query(
      `INSERT INTO account_credentials (account_id, email, username, password) VALUES ($1, $2, $3, $4)`,
      [accountId, email ?? null, username ?? null, saltedPassword]
    );

    // 3. Insert into account_profile
    await AppDbDataSourceReadWrite.query(
      `INSERT INTO account_profile (account_id, display_name, bio) VALUES ($1, NULL, NULL)`,
      [accountId]
    );

    // 4. Insert into account_settings, account_settings_locale, account_settings_notification
    const settingsResult = await AppDbDataSourceReadWrite.query(
      `INSERT INTO account_settings (account_id) VALUES ($1) RETURNING id`,
      [accountId]
    );
    const settingsId = settingsResult[0].id as number;

    await AppDbDataSourceReadWrite.query(
      `INSERT INTO account_settings_locale (account_settings_id, locale) VALUES ($1, $2)`,
      [settingsId, locale]
    );

    await AppDbDataSourceReadWrite.query(
      `INSERT INTO account_settings_notification (account_settings_id) VALUES ($1)`,
      [settingsId]
    );

    // 5. Insert into account_membership_status
    const membershipId = account_membership_id ?? AccountMembershipEnum.Trial;
    const membershipExpiresAt =
      membership_expires_at !== undefined && membership_expires_at !== null
        ? new Date(membership_expires_at)
        : await (async () => {
            const now = new Date();
            if (membershipId === AccountMembershipEnum.Premium) {
              const cadence: BillingCadence =
                premium_billing_cadence === 'monthly' ? 'monthly' : 'annual';
              return extendMembershipPeriodByCadence({
                membershipExpiresAt: null,
                cadence,
                now,
              });
            }
            const resolvedMembership =
              await billingPriceCatalogService.resolveProductMembership(now);
            return new Date(now.getTime() + resolvedMembership.freeTrialExpirationSeconds * 1000);
          })();
    await AppDbDataSourceReadWrite.query(
      `INSERT INTO account_membership_status (
        account_id,
        account_membership_id,
        membership_expires_at,
        allow_directory_add_by_rss,
        max_add_by_rss_feeds,
        max_manual_refreshes_per_hour,
        track_stats,
        allow_notifications
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        accountId,
        membershipId,
        membershipExpiresAt,
        allow_directory_add_by_rss ?? null,
        max_add_by_rss_feeds ?? null,
        max_manual_refreshes_per_hour ?? null,
        track_stats ?? null,
        allow_notifications ?? null,
      ]
    );

    // 6. Insert into account_metaboost
    await AppDbDataSourceReadWrite.query(
      `INSERT INTO account_metaboost (account_id, sender_guid) VALUES ($1, $2)`,
      [accountId, uuidv4()]
    );

    if (password) {
      res.status(201).json({ message: 'User created successfully' });
      return;
    }

    if (!capabilities.canIssueAdminInviteLink) {
      res
        .status(400)
        .json({ message: 'Invite link creation is not available in the current mode' });
      return;
    }

    // Generate a set-password invite link
    const token = uuidv4();
    const expiresAt = new Date(Date.now() + getSetPasswordTtlMs());

    await AppDbDataSourceReadWrite.query(
      `INSERT INTO account_set_password (account_id, set_password_token, set_password_token_expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (account_id) DO UPDATE SET set_password_token = $2, set_password_token_expires_at = $3`,
      [accountId, token, expiresAt]
    );

    const setPasswordUrl = `${config.appWeb.protocol}://${config.appWeb.domain}/set-password?token=${token}`;

    res.status(201).json({
      message: 'User created. Invite link generated.',
      set_password_url: setPasswordUrl,
    });
  } catch (error) {
    next(error);
  }
});

// Update user
router.patch('/:id', ensureAuthenticated, requireSuperuser, async (req, res, next) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const {
      email,
      username,
      verified,
      account_membership_id,
      membership_expires_at,
      allow_directory_add_by_rss,
      max_add_by_rss_feeds,
      max_manual_refreshes_per_hour,
      track_stats,
      allow_notifications,
    } = req.body as {
      email?: string;
      username?: string;
      verified?: boolean;
      account_membership_id?: number;
      membership_expires_at?: string | null;
      allow_directory_add_by_rss?: boolean | null;
      max_add_by_rss_feeds?: number | null;
      max_manual_refreshes_per_hour?: number | null;
      track_stats?: boolean | null;
      allow_notifications?: boolean | null;
    };

    if (email !== undefined && !validateEmail(email)) {
      res.status(400).json({ message: 'Invalid email' });
      return;
    }

    if (username !== undefined && !validateUsername(username)) {
      res
        .status(400)
        .json({ message: 'Invalid username (3-32 chars, alphanumeric, underscore, dash)' });
      return;
    }

    if (
      account_membership_id !== undefined &&
      account_membership_id !== AccountMembershipEnum.Trial &&
      account_membership_id !== AccountMembershipEnum.Premium
    ) {
      res.status(400).json({ message: 'Invalid account_membership_id' });
      return;
    }

    if (membership_expires_at !== undefined && membership_expires_at !== null) {
      const parsedMembershipExpiresAt = new Date(membership_expires_at);
      if (Number.isNaN(parsedMembershipExpiresAt.getTime())) {
        res.status(400).json({ message: 'Invalid membership_expires_at' });
        return;
      }
    }

    if (
      max_add_by_rss_feeds !== undefined &&
      max_add_by_rss_feeds !== null &&
      (!Number.isInteger(max_add_by_rss_feeds) || max_add_by_rss_feeds < 0)
    ) {
      res.status(400).json({ message: 'max_add_by_rss_feeds must be a non-negative integer' });
      return;
    }

    if (
      max_manual_refreshes_per_hour !== undefined &&
      max_manual_refreshes_per_hour !== null &&
      (!Number.isInteger(max_manual_refreshes_per_hour) || max_manual_refreshes_per_hour < 0)
    ) {
      res
        .status(400)
        .json({ message: 'max_manual_refreshes_per_hour must be a non-negative integer' });
      return;
    }

    // Check user exists
    const existing = await AppDbDataSourceRead.query(`SELECT a.id FROM account a WHERE a.id = $1`, [
      id,
    ]);
    if (existing.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Check for duplicate email/username if being changed
    if (email !== undefined || username !== undefined) {
      const dupCheck = await AppDbDataSourceRead.query(
        `SELECT id FROM account_credentials WHERE (email = $1 OR username = $2) AND account_id != $3`,
        [email ?? null, username ?? null, id]
      );
      if (dupCheck.length > 0) {
        res.status(409).json({ message: 'Email or username already in use' });
        return;
      }
    }

    if (
      account_membership_id !== undefined ||
      membership_expires_at !== undefined ||
      allow_directory_add_by_rss !== undefined ||
      max_add_by_rss_feeds !== undefined ||
      max_manual_refreshes_per_hour !== undefined ||
      track_stats !== undefined ||
      allow_notifications !== undefined
    ) {
      const membershipSets: string[] = [];
      const membershipParams: unknown[] = [];

      if (account_membership_id !== undefined) {
        membershipParams.push(account_membership_id);
        membershipSets.push(`account_membership_id = $${membershipParams.length}`);
      }
      if (membership_expires_at !== undefined) {
        membershipParams.push(
          membership_expires_at === null ? null : new Date(membership_expires_at)
        );
        membershipSets.push(`membership_expires_at = $${membershipParams.length}`);
      }
      if (allow_directory_add_by_rss !== undefined) {
        membershipParams.push(allow_directory_add_by_rss);
        membershipSets.push(`allow_directory_add_by_rss = $${membershipParams.length}`);
      }
      if (max_add_by_rss_feeds !== undefined) {
        membershipParams.push(max_add_by_rss_feeds);
        membershipSets.push(`max_add_by_rss_feeds = $${membershipParams.length}`);
      }
      if (max_manual_refreshes_per_hour !== undefined) {
        membershipParams.push(max_manual_refreshes_per_hour);
        membershipSets.push(`max_manual_refreshes_per_hour = $${membershipParams.length}`);
      }
      if (track_stats !== undefined) {
        membershipParams.push(track_stats);
        membershipSets.push(`track_stats = $${membershipParams.length}`);
      }
      if (allow_notifications !== undefined) {
        membershipParams.push(allow_notifications);
        membershipSets.push(`allow_notifications = $${membershipParams.length}`);
      }

      membershipParams.push(id);
      await AppDbDataSourceReadWrite.query(
        `UPDATE account_membership_status SET ${membershipSets.join(', ')} WHERE account_id = $${membershipParams.length}`,
        membershipParams
      );
    }

    // Update account table
    if (verified !== undefined) {
      await AppDbDataSourceReadWrite.query(`UPDATE account SET verified = $1 WHERE id = $2`, [
        verified,
        id,
      ]);
    }

    // Update credentials
    if (email !== undefined || username !== undefined) {
      const sets: string[] = [];
      const params: unknown[] = [];
      if (email !== undefined) {
        params.push(email);
        sets.push(`email = $${params.length}`);
      }
      if (username !== undefined) {
        params.push(username);
        sets.push(`username = $${params.length}`);
      }
      params.push(id);
      await AppDbDataSourceReadWrite.query(
        `UPDATE account_credentials SET ${sets.join(', ')} WHERE account_id = $${params.length}`,
        params
      );
    }

    // Fetch updated user
    const rows = await AppDbDataSourceRead.query(
      `SELECT a.id, a.id_text, a.verified, a.sharable_status_id, a.created_at,
                ac.email, ac.username,
                ams.account_membership_id, ams.membership_expires_at,
                ams.allow_directory_add_by_rss, ams.max_add_by_rss_feeds,
                ams.max_manual_refreshes_per_hour, ams.track_stats, ams.allow_notifications
         FROM account a
         LEFT JOIN account_credentials ac ON ac.account_id = a.id
         LEFT JOIN account_membership_status ams ON ams.account_id = a.id
         WHERE a.id = $1`,
      [id]
    );

    res.json({ user: userRowToJson(rows[0]) });
  } catch (error) {
    next(error);
  }
});

// Delete user
router.delete('/:id', ensureAuthenticated, requireSuperuser, async (req, res, next) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const existing = await AppDbDataSourceRead.query(`SELECT id FROM account WHERE id = $1`, [id]);
    if (existing.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    // Cascading deletes will handle account_credentials, account_profile, etc.
    await AppDbDataSourceReadWrite.query(`DELETE FROM account WHERE id = $1`, [id]);

    res.json({ message: 'User deleted' });
  } catch (error) {
    next(error);
  }
});

// Set user password (admin-initiated)
router.post('/:id/password', ensureAuthenticated, requireSuperuser, async (req, res, next) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const { password } = req.body as { password?: string };
    if (!password || !validatePassword(password)) {
      res.status(400).json({ message: 'Invalid password (min 8 chars)' });
      return;
    }

    const existing = await AppDbDataSourceRead.query(`SELECT id FROM account WHERE id = $1`, [id]);
    if (existing.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const saltedPassword = await hashPassword(password);
    await AppDbDataSourceReadWrite.query(
      `UPDATE account_credentials SET password = $1 WHERE account_id = $2`,
      [saltedPassword, id]
    );

    // Remove any set-password token
    await AppDbDataSourceReadWrite.query(`DELETE FROM account_set_password WHERE account_id = $1`, [
      id,
    ]);

    res.json({ message: 'Password updated' });
  } catch (error) {
    next(error);
  }
});

// Get active invite link for user
router.get('/:id/invite-link', ensureAuthenticated, requireSuperuser, async (req, res, next) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const rows = await AppDbDataSourceRead.query(
      `SELECT set_password_token, set_password_token_expires_at
         FROM account_set_password
         WHERE account_id = $1`,
      [id]
    );

    if (rows.length === 0) {
      res.json({ invite_link: null });
      return;
    }

    const row = rows[0];
    const expiresAt = new Date(row.set_password_token_expires_at);
    const isExpired = expiresAt < new Date();

    res.json({
      invite_link: isExpired
        ? null
        : {
            url: `${config.appWeb.protocol}://${config.appWeb.domain}/set-password?token=${row.set_password_token}`,
            expires_at: row.set_password_token_expires_at,
            is_expired: isExpired,
          },
    });
  } catch (error) {
    next(error);
  }
});

// Generate or regenerate invite link for user
router.post('/:id/invite-link', ensureAuthenticated, requireSuperuser, async (req, res, next) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    const existing = await AppDbDataSourceRead.query(`SELECT id FROM account WHERE id = $1`, [id]);
    if (existing.length === 0) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + getSetPasswordTtlMs());

    await AppDbDataSourceReadWrite.query(
      `INSERT INTO account_set_password (account_id, set_password_token, set_password_token_expires_at)
         VALUES ($1, $2, $3)
         ON CONFLICT (account_id) DO UPDATE SET set_password_token = $2, set_password_token_expires_at = $3`,
      [id, token, expiresAt]
    );

    const inviteUrl = `${config.appWeb.protocol}://${config.appWeb.domain}/set-password?token=${token}`;

    res.status(201).json({
      invite_link: {
        url: inviteUrl,
        expires_at: expiresAt.toISOString(),
        is_expired: false,
      },
    });
  } catch (error) {
    next(error);
  }
});

// Revoke invite link for user
router.delete('/:id/invite-link', ensureAuthenticated, requireSuperuser, async (req, res, next) => {
  try {
    const id = parseIdParam(req.params.id);
    if (id === null) {
      res.status(400).json({ message: 'Invalid id' });
      return;
    }

    await AppDbDataSourceReadWrite.query(`DELETE FROM account_set_password WHERE account_id = $1`, [
      id,
    ]);

    res.json({ message: 'Invite link revoked' });
  } catch (error) {
    next(error);
  }
});

const usersRoot = express.Router();
usersRoot.use(`${config.api.prefix}${config.api.version}/users`, router);

export const usersRouter = usersRoot;
