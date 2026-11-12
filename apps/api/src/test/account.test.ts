import bcrypt from 'bcrypt';
import type { Server } from 'http';
import request from 'supertest';
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import { accountSessionStoreStub } from './helpers/accountSessionStoreStub.js';
import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_ACCOUNT_SESSION_ID_TEXT,
  TEST_USER_ACCOUNT_ID_TEXT,
  withMutedExpectedErrorLogs,
} from './helpers/index.js';

const TEST_EMAIL = 'account-test@example.com';
const TEST_USER_ID = 1;
const VALID_TERMS_VERSION = '2026-10-15';

const validAccountCreateBody = {
  email: 'new@example.com',
  password: 'valid-password-123',
  locale: 'en-US',
  terms_version: VALID_TERMS_VERSION,
};

function setCookieHeader(res: request.Response): string {
  const header: unknown = res.headers['set-cookie'];
  if (Array.isArray(header)) {
    return header.filter((value): value is string => typeof value === 'string').join('\n');
  }
  return typeof header === 'string' ? header : '';
}

const {
  createMock,
  getByEmailMock,
  getMock,
  updateMock,
  deleteMock,
  verifyEmailMock,
  resetPasswordMock,
  getByIdTextMock,
  verificationUpdateMock,
  verificationGetByTokenMock,
  resetPasswordUpdateMock,
  resetPasswordGetByTokenMock,
  emailChangeCreateMock,
  emailChangeGetByTokenMock,
  emailChangeDeleteByAccountIdMock,
  credentialsUpdateMock,
  credentialsGetByEmailMock,
  exportUserDataMock,
  sendVerificationEmailMock,
  probeVerificationMailerMock,
  sendResetPasswordEmailMock,
  sendEmailChangeVerificationEmailMock,
  setPasswordGetByTokenMock,
  setPasswordDeleteByAccountIdMock,
} = vi.hoisted(() => ({
  createMock: vi.fn(async () => ({})),
  getByEmailMock: vi.fn(async () => ({
    id: TEST_USER_ID,
    id_text: TEST_USER_ACCOUNT_ID_TEXT,
    verified: true,
    account_credentials: { email: TEST_EMAIL, password: 'hashed-password' },
  })),
  getMock: vi.fn(async () => ({
    id: TEST_USER_ID,
    id_text: TEST_USER_ACCOUNT_ID_TEXT,
    account_credentials: { email: TEST_EMAIL },
    account_membership_status: {
      membership_expires_at: new Date(Date.now() + 86400000 * 365),
    },
  })),
  updateMock: vi.fn(async () => ({ id: TEST_USER_ID })),
  deleteMock: vi.fn(async () => {}),
  verifyEmailMock: vi.fn(async () => {}),
  resetPasswordMock: vi.fn(async () => 'changed' as const),
  getByIdTextMock: vi.fn(async () => null),
  verificationUpdateMock: vi.fn(async () => {}),
  verificationGetByTokenMock: vi.fn(async () => null),
  resetPasswordUpdateMock: vi.fn(async () => {}),
  resetPasswordGetByTokenMock: vi.fn(async () => null),
  emailChangeCreateMock: vi.fn(async () => {}),
  emailChangeGetByTokenMock: vi.fn(async () => null),
  emailChangeDeleteByAccountIdMock: vi.fn(async () => {}),
  credentialsUpdateMock: vi.fn(async () => {}),
  credentialsGetByEmailMock: vi.fn(async () => null),
  exportUserDataMock: vi.fn(async () => ({ account: { id: TEST_USER_ID } })),
  sendVerificationEmailMock: vi.fn(async () => 'sent' as const),
  probeVerificationMailerMock: vi.fn(async () => 'skipped' as const),
  sendResetPasswordEmailMock: vi.fn(async () => {}),
  sendEmailChangeVerificationEmailMock: vi.fn(async () => 'sent' as const),
  setPasswordGetByTokenMock: vi.fn(async () => null),
  setPasswordDeleteByAccountIdMock: vi.fn(async () => {}),
}));

vi.mock('@podverse/orm', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@podverse/orm')>();

  class MockCategoryService {
    async setCategoryCache(): Promise<void> {}
  }

  class MockAccountService {
    create = createMock;
    getByEmail = getByEmailMock;
    get = getMock;
    update = updateMock;
    delete = deleteMock;
    verifyEmail = verifyEmailMock;
    resetPassword = resetPasswordMock;
    getByIdText = getByIdTextMock;
  }

  class MockAccountVerificationService {
    update = verificationUpdateMock;
    getByToken = verificationGetByTokenMock;
  }

  class MockAccountResetPasswordService {
    update = resetPasswordUpdateMock;
    getByToken = resetPasswordGetByTokenMock;
  }

  class MockAccountEmailChangeVerificationService {
    create = emailChangeCreateMock;
    getByToken = emailChangeGetByTokenMock;
    deleteByAccountId = emailChangeDeleteByAccountIdMock;
  }

  class MockAccountCredentialsService {
    update = credentialsUpdateMock;
    getByEmail = credentialsGetByEmailMock;
  }

  class MockAccountDataExportService {
    exportUserData = exportUserDataMock;
  }

  class MockAccountSetPasswordService {
    getByToken = setPasswordGetByTokenMock;
    deleteByAccountId = setPasswordDeleteByAccountIdMock;
  }

  return {
    ...actual,
    CategoryService: MockCategoryService,
    AccountService: MockAccountService,
    AccountVerificationService: MockAccountVerificationService,
    AccountResetPasswordService: MockAccountResetPasswordService,
    AccountEmailChangeVerificationService: MockAccountEmailChangeVerificationService,
    AccountCredentialsService: MockAccountCredentialsService,
    AccountDataExportService: MockAccountDataExportService,
    AccountSetPasswordService: MockAccountSetPasswordService,
  };
});

vi.mock('../lib/mailer/sendVerificationEmail.js', () => ({
  sendVerificationEmail: sendVerificationEmailMock,
  probeVerificationMailer: probeVerificationMailerMock,
}));

vi.mock('../lib/mailer/sendResetPasswordEmail.js', () => ({
  sendResetPasswordEmail: sendResetPasswordEmailMock,
}));

vi.mock('../lib/mailer/sendChangeEmailVerificationEmail.js', () => ({
  sendEmailChangeVerificationEmail: sendEmailChangeVerificationEmailMock,
}));

let accountBase: string;

describe('account CRUD and email routes', () => {
  let server: Server | undefined;
  let ormContext: ORMContext | undefined;
  let app: import('express').Express;

  beforeAll(async () => {
    const result = await startTestApp();
    app = result.app;
    server = result.server;
    ormContext = result.ormContext;
    accountBase = (await getBaseApiUrl()) + '/account';
  }, 30000);

  afterAll(async () => {
    await stopTestApp(server, ormContext);
  });

  describe('POST /account (create)', () => {
    beforeEach(() => {
      createMock.mockReset();
      createMock.mockResolvedValue({});
      sendVerificationEmailMock.mockReset();
      sendVerificationEmailMock.mockResolvedValue('sent');
      probeVerificationMailerMock.mockReset();
      probeVerificationMailerMock.mockResolvedValue('skipped');
      verificationUpdateMock.mockClear();
      credentialsUpdateMock.mockClear();
      getByEmailMock.mockReset();
      getByEmailMock.mockResolvedValue({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        verified: true,
        account_credentials: { email: TEST_EMAIL, password: 'hashed-password' },
      });
    });

    it('returns 200 with valid data', async () => {
      createMock.mockResolvedValueOnce({});
      getByEmailMock.mockResolvedValueOnce({
        id: 2,
        id_text: 'new-user',
        verified: false,
        account_credentials: { email: 'new@example.com' },
      });
      verificationUpdateMock.mockResolvedValueOnce({});

      const res = await request(app).post(`${accountBase}/`).send(validAccountCreateBody);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Account created');
      expect(res.body.code).toBeUndefined();
      expect(createMock).toHaveBeenCalledTimes(1);
      expect(createMock).toHaveBeenCalledWith(
        expect.objectContaining({
          terms_version: VALID_TERMS_VERSION,
        })
      );
    });

    it('returns 200 on duplicate email (prevents enumeration)', async () => {
      const { ERROR_MESSAGES } = await import('@podverse/helpers');
      createMock.mockRejectedValueOnce(new Error(ERROR_MESSAGES.ACCOUNT.ALREADY_EXISTS));

      const res = await request(app)
        .post(`${accountBase}/`)
        .send({
          ...validAccountCreateBody,
          email: 'duplicate@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Account created');
      expect(res.body.code).toBeUndefined();
      expect(sendVerificationEmailMock).not.toHaveBeenCalled();
      expect(verificationUpdateMock).not.toHaveBeenCalled();
      expect(credentialsUpdateMock).not.toHaveBeenCalled();
    });

    it('returns the failure code when the verification email is not sent', async () => {
      createMock.mockResolvedValueOnce({});
      getByEmailMock.mockResolvedValueOnce({
        id: 2,
        id_text: 'new-user',
        verified: false,
        account_credentials: { email: 'new@example.com' },
      });
      sendVerificationEmailMock.mockResolvedValueOnce('failed');

      const res = await request(app).post(`${accountBase}/`).send(validAccountCreateBody);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'Account created',
        code: 'verification_email_not_sent',
      });
    });

    it('omits the failure code when the mailer is skipped', async () => {
      createMock.mockResolvedValueOnce({});
      getByEmailMock.mockResolvedValueOnce({
        id: 2,
        id_text: 'new-user',
        verified: false,
        account_credentials: { email: 'new@example.com' },
      });
      sendVerificationEmailMock.mockResolvedValueOnce('skipped');

      const res = await request(app).post(`${accountBase}/`).send(validAccountCreateBody);

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Account created' });
    });

    it('sends another verification email for an unverified duplicate signup', async () => {
      const { ERROR_MESSAGES } = await import('@podverse/helpers');
      createMock.mockRejectedValueOnce(new Error(ERROR_MESSAGES.ACCOUNT.ALREADY_EXISTS));
      getByEmailMock.mockResolvedValue({
        id: 2,
        id_text: 'existing-user',
        verified: false,
        account_credentials: { email: 'duplicate@example.com' },
      });

      const res = await request(app)
        .post(`${accountBase}/`)
        .send({
          ...validAccountCreateBody,
          email: 'duplicate@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Account created' });
      expect(sendVerificationEmailMock).toHaveBeenCalledTimes(1);
      expect(credentialsUpdateMock).not.toHaveBeenCalled();
    });

    it('returns the failure code for a verified duplicate when the mailer is down', async () => {
      const { ERROR_MESSAGES } = await import('@podverse/helpers');
      createMock.mockRejectedValueOnce(new Error(ERROR_MESSAGES.ACCOUNT.ALREADY_EXISTS));
      probeVerificationMailerMock.mockResolvedValueOnce('failed');

      const res = await request(app)
        .post(`${accountBase}/`)
        .send({
          ...validAccountCreateBody,
          email: 'verified-duplicate@example.com',
        });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        message: 'Account created',
        code: 'verification_email_not_sent',
      });
      expect(sendVerificationEmailMock).not.toHaveBeenCalled();
      expect(verificationUpdateMock).not.toHaveBeenCalled();
      expect(credentialsUpdateMock).not.toHaveBeenCalled();
    });

    it('returns 400 with password too short', async () => {
      const res = await request(app).post(`${accountBase}/`).send({
        email: 'short@example.com',
        password: 'short',
        locale: 'en-US',
        terms_version: VALID_TERMS_VERSION,
      });

      expect(res.status).toBe(400);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      let limitedResponse: request.Response | null = null;

      for (let i = 0; i < 120; i++) {
        const res = await request(app)
          .post(`${accountBase}/`)
          .send({
            ...validAccountCreateBody,
            email: `rl-${i}@example.com`,
          });

        if (res.status === 429) {
          limitedResponse = res;
          break;
        }

        expect(res.status).toBe(200);
      }

      expect(limitedResponse?.status).toBe(429);
    }, 15000);
  });

  describe('PUT /account (update)', () => {
    it('returns 200 with valid data and active membership', async () => {
      updateMock.mockResolvedValueOnce({ id: TEST_USER_ID, display_name: 'Updated Name' });

      const res = await request(app).put(`${accountBase}/`).set(authHeaders(TEST_USER_ID)).send({
        display_name: 'Updated Name',
        bio: 'Updated bio',
        sharable_status: 1,
        locale: 'en-US',
      });

      expect(res.status).toBe(200);
      expect(updateMock).toHaveBeenCalledTimes(1);
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).put(`${accountBase}/`).send({
        display_name: 'Test',
        bio: null,
        sharable_status: 1,
        locale: 'en-US',
      });

      expect(res.status).toBe(401);
    });

    it('returns 403 with expired membership', async () => {
      getMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() - 86400000),
        },
      });

      const res = await withMutedExpectedErrorLogs(async () =>
        request(app).put(`${accountBase}/`).set(authHeaders(TEST_USER_ID)).send({
          display_name: 'Test',
          bio: null,
          sharable_status: 1,
          locale: 'en-US',
        })
      );

      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /account/delete', () => {
    it('returns 200 with valid auth', async () => {
      deleteMock.mockResolvedValueOnce({});

      const res = await request(app).delete(`${accountBase}/delete`).set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Account deleted successfully');
      expect(deleteMock).toHaveBeenCalledWith(TEST_USER_ID);
      expect(setCookieHeader(res)).toContain('jwt=;');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).delete(`${accountBase}/delete`);

      expect(res.status).toBe(401);
    });
  });

  describe('POST /account/send-verification-email', () => {
    it('returns 200 with valid email', async () => {
      getByEmailMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: 'test-user',
        account_credentials: { email: TEST_EMAIL },
      });

      const res = await request(app)
        .post(`${accountBase}/send-verification-email`)
        .send({ email: TEST_EMAIL });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Verification email sent');
      expect(res.body.code).toBeUndefined();
    });

    it('returns 503 when the verification email is not sent', async () => {
      getByEmailMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: 'test-user',
        account_credentials: { email: TEST_EMAIL },
      });
      sendVerificationEmailMock.mockResolvedValueOnce('failed');

      const res = await request(app)
        .post(`${accountBase}/send-verification-email`)
        .send({ email: TEST_EMAIL });

      expect(res.status).toBe(503);
      expect(res.body).toEqual({
        message: 'Verification email not sent',
        code: 'verification_email_not_sent',
      });
    });
  });

  describe('POST /account/verify-email', () => {
    it('returns 200 with valid token', async () => {
      verificationGetByTokenMock.mockResolvedValueOnce({
        account: { id: TEST_USER_ID },
      });
      verifyEmailMock.mockResolvedValueOnce({});

      const res = await request(app)
        .post(`${accountBase}/verify-email`)
        .send({ token: 'valid-verification-token' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Email verified successfully');
    });

    it('returns 400 with invalid token', async () => {
      verificationGetByTokenMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`${accountBase}/verify-email`)
        .send({ token: 'invalid-token' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired verification token');
    });
  });

  describe('POST /account/send-change-email-address-email', () => {
    it('returns 200 with auth + active membership', async () => {
      getMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() + 86400000 * 365),
        },
      });

      const res = await request(app)
        .post(`${accountBase}/send-change-email-address-email`)
        .set(authHeaders(TEST_USER_ID))
        .send({ new_email: 'newemail@example.com' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Email change verification email sent');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app)
        .post(`${accountBase}/send-change-email-address-email`)
        .send({ new_email: 'newemail@example.com' });

      expect(res.status).toBe(401);
    });

    it('returns 403 with expired membership', async () => {
      getMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: TEST_USER_ACCOUNT_ID_TEXT,
        account_credentials: { email: TEST_EMAIL },
        account_membership_status: {
          membership_expires_at: new Date(Date.now() - 86400000),
        },
      });

      const res = await withMutedExpectedErrorLogs(async () =>
        request(app)
          .post(`${accountBase}/send-change-email-address-email`)
          .set(authHeaders(TEST_USER_ID))
          .send({ new_email: 'newemail@example.com' })
      );

      expect(res.status).toBe(403);
    });
  });

  describe('POST /account/verify-email-change', () => {
    it('returns 200 with valid token', async () => {
      emailChangeGetByTokenMock.mockResolvedValueOnce({
        account: { id: TEST_USER_ID },
        pending_email_address: 'newemail@example.com',
      });

      const res = await request(app)
        .post(`${accountBase}/verify-email-change`)
        .send({ token: 'valid-email-change-token' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Email change verified successfully');
      expect(credentialsGetByEmailMock).toHaveBeenCalledWith('newemail@example.com');
      expect(credentialsUpdateMock).toHaveBeenCalledTimes(1);
      expect(emailChangeDeleteByAccountIdMock).toHaveBeenCalledWith(TEST_USER_ID);
    });

    it('returns 400 with invalid token', async () => {
      emailChangeGetByTokenMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`${accountBase}/verify-email-change`)
        .send({ token: 'invalid-token' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired verification token');
    });
  });

  describe('POST /account/send-reset-password-email', () => {
    it('returns 200 with valid email', async () => {
      getByEmailMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: 'test-user',
        account_credentials: { email: TEST_EMAIL },
      });
      resetPasswordUpdateMock.mockResolvedValueOnce({});

      const res = await request(app)
        .post(`${accountBase}/send-reset-password-email`)
        .send({ email: TEST_EMAIL });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Reset password email sent');
    });
  });

  describe('POST /account/reset-password', () => {
    beforeEach(() => {
      accountSessionStoreStub.endAccountSessions.mockClear();
    });

    it('returns 200 with valid token and password', async () => {
      resetPasswordGetByTokenMock.mockResolvedValueOnce({
        account: { id: TEST_USER_ID },
      });
      resetPasswordMock.mockResolvedValueOnce('changed');

      const res = await request(app)
        .post(`${accountBase}/reset-password`)
        .send({ token: 'valid-reset-token', password: 'new-password-123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reset successfully');
      expect(resetPasswordMock).toHaveBeenCalledWith(TEST_USER_ID, 'new-password-123');
      expect(accountSessionStoreStub.endAccountSessions).toHaveBeenCalledWith({
        accountId: TEST_USER_ID,
        reason: 'password_changed',
        exceptSessionIdText: null,
      });
      expect(setCookieHeader(res)).toContain('jwt=;');
    });

    it('returns 400 with invalid token', async () => {
      resetPasswordGetByTokenMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`${accountBase}/reset-password`)
        .send({ token: 'invalid-token', password: 'new-password-123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired reset password token');
      expect(accountSessionStoreStub.endAccountSessions).not.toHaveBeenCalled();
    });

    it('returns 400 when the new password breaks the sign-up rule', async () => {
      resetPasswordGetByTokenMock.mockResolvedValueOnce({
        account: { id: TEST_USER_ID },
      });
      resetPasswordMock.mockResolvedValueOnce('invalid_new_password');

      const res = await request(app)
        .post(`${accountBase}/reset-password`)
        .send({ token: 'valid-reset-token', password: 'alllowercase' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Password does not meet the requirements' });
      expect(setCookieHeader(res)).not.toContain('jwt=');
      expect(accountSessionStoreStub.endAccountSessions).not.toHaveBeenCalled();
    });
  });

  describe('POST /account/set-password', () => {
    const futureExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    beforeEach(async () => {
      // The app loads routes after the module registry resets, so the reset uses that limiter.
      // Supertest's address is IPv4-mapped and the limiter stores the IPv4 form.
      const { accountSetPasswordRateLimit } = await import('../routes/account.js');
      accountSetPasswordRateLimit.resetKey('127.0.0.1');
      credentialsUpdateMock.mockClear();
      accountSessionStoreStub.endAccountSessions.mockClear();
    });

    it('returns 200 for a username-only account when no email is provided', async () => {
      setPasswordGetByTokenMock.mockResolvedValueOnce({
        set_password_token_expires_at: futureExpiresAt,
        account: {
          id: TEST_USER_ID,
          account_credentials: { email: null, username: 'username-only-user' },
        },
      });
      resetPasswordMock.mockResolvedValueOnce('changed');
      verifyEmailMock.mockResolvedValueOnce({});
      setPasswordDeleteByAccountIdMock.mockResolvedValueOnce({});

      const res = await request(app)
        .post(`${accountBase}/set-password`)
        .send({ token: 'valid-set-password-token', password: 'new-password-123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password set successfully');
      expect(resetPasswordMock).toHaveBeenCalledWith(TEST_USER_ID, 'new-password-123');
      expect(credentialsUpdateMock).not.toHaveBeenCalled();
      expect(accountSessionStoreStub.endAccountSessions).toHaveBeenCalledWith({
        accountId: TEST_USER_ID,
        reason: 'password_changed',
        exceptSessionIdText: null,
      });
      expect(setCookieHeader(res)).toContain('jwt=;');
    });

    it('returns 200 and saves email for an email-less account when email is provided', async () => {
      setPasswordGetByTokenMock.mockResolvedValueOnce({
        set_password_token_expires_at: futureExpiresAt,
        account: {
          id: TEST_USER_ID,
          account_credentials: { email: null, username: 'username-only-user' },
        },
      });
      resetPasswordMock.mockResolvedValueOnce('changed');
      credentialsUpdateMock.mockResolvedValueOnce({});
      verifyEmailMock.mockResolvedValueOnce({});
      setPasswordDeleteByAccountIdMock.mockResolvedValueOnce({});

      const res = await request(app).post(`${accountBase}/set-password`).send({
        token: 'valid-set-password-token',
        password: 'new-password-123',
        email: 'new@example.com',
      });

      expect(res.status).toBe(200);
      expect(credentialsUpdateMock).toHaveBeenCalledWith(
        expect.objectContaining({ id: TEST_USER_ID }),
        { email: 'new@example.com' }
      );
      expect(accountSessionStoreStub.endAccountSessions).toHaveBeenCalledWith({
        accountId: TEST_USER_ID,
        reason: 'password_changed',
        exceptSessionIdText: null,
      });
      expect(setCookieHeader(res)).toContain('jwt=;');
    });

    it('returns 400 when token is invalid', async () => {
      setPasswordGetByTokenMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`${accountBase}/set-password`)
        .send({ token: 'bad-token', password: 'new-password-123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired token');
      expect(accountSessionStoreStub.endAccountSessions).not.toHaveBeenCalled();
    });

    it('returns 400 when token has expired', async () => {
      setPasswordGetByTokenMock.mockResolvedValueOnce({
        set_password_token_expires_at: new Date(Date.now() - 1000),
        account: {
          id: TEST_USER_ID,
          account_credentials: { email: null, username: 'username-only-user' },
        },
      });

      const res = await request(app)
        .post(`${accountBase}/set-password`)
        .send({ token: 'expired-token', password: 'new-password-123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Token has expired');
      expect(accountSessionStoreStub.endAccountSessions).not.toHaveBeenCalled();
    });

    it('returns 400 when the new password breaks the sign-up rule', async () => {
      setPasswordGetByTokenMock.mockResolvedValueOnce({
        set_password_token_expires_at: futureExpiresAt,
        account: {
          id: TEST_USER_ID,
          account_credentials: { email: null, username: 'username-only-user' },
        },
      });
      resetPasswordMock.mockResolvedValueOnce('invalid_new_password');
      verifyEmailMock.mockClear();
      setPasswordDeleteByAccountIdMock.mockClear();

      const res = await request(app)
        .post(`${accountBase}/set-password`)
        .send({ token: 'valid-set-password-token', password: 'alllowercase' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({ message: 'Password does not meet the requirements' });
      expect(setCookieHeader(res)).not.toContain('jwt=');
      expect(verifyEmailMock).not.toHaveBeenCalled();
      expect(setPasswordDeleteByAccountIdMock).not.toHaveBeenCalled();
      expect(accountSessionStoreStub.endAccountSessions).not.toHaveBeenCalled();
    });
  });

  describe('POST /account/change-password', () => {
    let currentHash = '';

    const accountRecord = (password?: string) => ({
      id: TEST_USER_ID,
      id_text: TEST_USER_ACCOUNT_ID_TEXT,
      account_credentials:
        password === undefined ? { email: TEST_EMAIL } : { email: TEST_EMAIL, password },
      account_membership_status: {
        membership_expires_at: new Date(Date.now() + 86400000 * 365),
      },
    });

    beforeAll(async () => {
      currentHash = await bcrypt.hash('Current-pass1', 4);
    });

    beforeEach(async () => {
      // The app loads routes after the module registry resets, so the reset uses that limiter.
      const { accountChangePasswordRateLimit } = await import('../routes/account.js');
      accountChangePasswordRateLimit.resetForUser(TEST_USER_ID);
      resetPasswordMock.mockClear();
      accountSessionStoreStub.endAccountSessions.mockClear();
      getMock.mockResolvedValue(accountRecord(currentHash));
    });

    afterEach(() => {
      getMock.mockReset();
      getMock.mockImplementation(async () => accountRecord());
    });

    it('changes the password, ends every other session, and does not set a cookie', async () => {
      const res = await request(app)
        .post(`${accountBase}/change-password`)
        .set(authHeaders(TEST_USER_ID))
        .send({ current_password: 'Current-pass1', new_password: 'New-pass2' });

      expect(res.status).toBe(200);
      expect(res.body).toEqual({ message: 'Password changed', revoked_count: 0 });
      expect(resetPasswordMock).toHaveBeenCalledWith(TEST_USER_ID, 'New-pass2');
      expect(accountSessionStoreStub.endAccountSessions).toHaveBeenCalledWith({
        accountId: TEST_USER_ID,
        reason: 'password_changed',
        exceptSessionIdText: TEST_ACCOUNT_SESSION_ID_TEXT,
      });
      expect(setCookieHeader(res)).not.toContain('jwt=');
    });

    it('returns 400 current_password_incorrect and changes nothing when the current password is wrong', async () => {
      const res = await request(app)
        .post(`${accountBase}/change-password`)
        .set(authHeaders(TEST_USER_ID))
        .send({ current_password: 'Wrong-pass1', new_password: 'New-pass2' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: 'Current password is incorrect',
        code: 'current_password_incorrect',
      });
      expect(resetPasswordMock).not.toHaveBeenCalled();
      expect(accountSessionStoreStub.endAccountSessions).not.toHaveBeenCalled();
    });

    it('returns 400 invalid_new_password and ends no session when the new password breaks the rule', async () => {
      resetPasswordMock.mockResolvedValueOnce('invalid_new_password');

      const res = await request(app)
        .post(`${accountBase}/change-password`)
        .set(authHeaders(TEST_USER_ID))
        .send({ current_password: 'Current-pass1', new_password: 'alllowercase' });

      expect(res.status).toBe(400);
      expect(res.body).toEqual({
        message: 'New password does not meet the requirements',
        code: 'invalid_new_password',
      });
      expect(accountSessionStoreStub.endAccountSessions).not.toHaveBeenCalled();
    });

    it('returns 400 with no code when new_password is missing', async () => {
      const res = await request(app)
        .post(`${accountBase}/change-password`)
        .set(authHeaders(TEST_USER_ID))
        .send({ current_password: 'Current-pass1' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBeUndefined();
      expect(resetPasswordMock).not.toHaveBeenCalled();
      expect(accountSessionStoreStub.endAccountSessions).not.toHaveBeenCalled();
    });

    it('returns 400 with no code when current_password is empty', async () => {
      const res = await request(app)
        .post(`${accountBase}/change-password`)
        .set(authHeaders(TEST_USER_ID))
        .send({ current_password: '', new_password: 'New-pass2' });

      expect(res.status).toBe(400);
      expect(res.body.code).toBeUndefined();
      expect(resetPasswordMock).not.toHaveBeenCalled();
      expect(accountSessionStoreStub.endAccountSessions).not.toHaveBeenCalled();
    });

    it('returns 401 when the caller is not signed in', async () => {
      const res = await request(app)
        .post(`${accountBase}/change-password`)
        .send({ current_password: 'Current-pass1', new_password: 'New-pass2' });

      expect(res.status).toBe(401);
      expect(resetPasswordMock).not.toHaveBeenCalled();
      expect(accountSessionStoreStub.endAccountSessions).not.toHaveBeenCalled();
    });
  });

  describe('GET /account/download-data', () => {
    it('returns 200 with auth and zip content type', async () => {
      exportUserDataMock.mockResolvedValueOnce({ account: { id: TEST_USER_ID } });

      const res = await request(app)
        .get(`${accountBase}/download-data`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.headers['content-type']).toContain('application/zip');
    });

    it('returns 401 without auth', async () => {
      const res = await request(app).get(`${accountBase}/download-data`);

      expect(res.status).toBe(401);
    });
  });

  describe('GET /account/:id_text', () => {
    it('returns 200 with public account', async () => {
      getByIdTextMock.mockResolvedValueOnce({
        id: 42,
        id_text: 'public-user',
        sharable_status: { id: 1 },
        account_credentials: { email: 'public@example.com', password: 'secret' },
        account_membership_status: { membership_expires_at: new Date() },
      });

      const res = await request(app).get(`${accountBase}/public-user`);

      expect(res.status).toBe(200);
      expect(res.body.id_text).toBe('public-user');
      expect(res.body.sharable_status_id).toBe(1);
      expect(res.body.sharable_status).toBeUndefined();
    });

    it('returns 200 for own account when authenticated', async () => {
      getByIdTextMock.mockResolvedValueOnce({
        id: TEST_USER_ID,
        id_text: 'my-account',
        sharable_status: { id: 3 },
        account_credentials: { email: TEST_EMAIL },
      });

      const res = await request(app)
        .get(`${accountBase}/my-account`)
        .set(authHeaders(TEST_USER_ID));

      expect(res.status).toBe(200);
      expect(res.body.id_text).toBe('my-account');
    });

    it('returns 404 for private account when not owner', async () => {
      getByIdTextMock.mockResolvedValueOnce({
        id: 99,
        id_text: 'private-user',
        sharable_status: { id: 3 },
      });

      const res = await request(app).get(`${accountBase}/private-user`);

      expect(res.status).toBe(404);
    });

    it('returns 404 for nonexistent account', async () => {
      getByIdTextMock.mockResolvedValueOnce(null);

      const res = await request(app).get(`${accountBase}/nonexistent`);

      expect(res.status).toBe(404);
    });
  });
});
