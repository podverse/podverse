import type { Server } from 'http';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import type { ORMContext } from '@podverse/orm';

import {
  authHeaders,
  getBaseApiUrl,
  startTestApp,
  stopTestApp,
  TEST_USER_ACCOUNT_ID_TEXT,
  withMutedExpectedErrorLogs,
} from './helpers/index.js';

const TEST_EMAIL = 'account-test@example.com';
const TEST_USER_ID = 1;

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
  exportUserDataMock,
  sendVerificationEmailMock,
  sendResetPasswordEmailMock,
  sendEmailChangeVerificationEmailMock,
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
  resetPasswordMock: vi.fn(async () => {}),
  getByIdTextMock: vi.fn(async () => null),
  verificationUpdateMock: vi.fn(async () => {}),
  verificationGetByTokenMock: vi.fn(async () => null),
  resetPasswordUpdateMock: vi.fn(async () => {}),
  resetPasswordGetByTokenMock: vi.fn(async () => null),
  emailChangeCreateMock: vi.fn(async () => {}),
  emailChangeGetByTokenMock: vi.fn(async () => null),
  emailChangeDeleteByAccountIdMock: vi.fn(async () => {}),
  credentialsUpdateMock: vi.fn(async () => {}),
  exportUserDataMock: vi.fn(async () => ({ account: { id: TEST_USER_ID } })),
  sendVerificationEmailMock: vi.fn(async () => {}),
  sendResetPasswordEmailMock: vi.fn(async () => {}),
  sendEmailChangeVerificationEmailMock: vi.fn(async () => {}),
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
  }

  class MockAccountDataExportService {
    exportUserData = exportUserDataMock;
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
  };
});

vi.mock('../lib/mailer/sendVerificationEmail.js', () => ({
  sendVerificationEmail: sendVerificationEmailMock,
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
    it('returns 200 with valid data', async () => {
      createMock.mockResolvedValueOnce({});
      getByEmailMock.mockResolvedValueOnce({
        id: 2,
        id_text: 'new-user',
        verified: false,
        account_credentials: { email: 'new@example.com' },
      });
      verificationUpdateMock.mockResolvedValueOnce({});

      const res = await request(app).post(`${accountBase}/`).send({
        email: 'new@example.com',
        password: 'valid-password-123',
        locale: 'en-US',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Account created');
      expect(createMock).toHaveBeenCalledTimes(1);
    });

    it('returns 200 on duplicate email (prevents enumeration)', async () => {
      const { ERROR_MESSAGES } = await import('@podverse/helpers');
      createMock.mockRejectedValueOnce(new Error(ERROR_MESSAGES.ACCOUNT.ALREADY_EXISTS));

      const res = await request(app).post(`${accountBase}/`).send({
        email: 'duplicate@example.com',
        password: 'valid-password-123',
        locale: 'en-US',
      });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Account created');
    });

    it('returns 400 with password too short', async () => {
      const res = await request(app).post(`${accountBase}/`).send({
        email: 'short@example.com',
        password: 'short',
        locale: 'en-US',
      });

      expect(res.status).toBe(400);
    });

    it('returns 429 when rate limit is exceeded', async () => {
      createMock.mockRejectedValue(new Error('Rate limited test'));

      for (let i = 0; i < 3; i++) {
        await request(app)
          .post(`${accountBase}/`)
          .send({
            email: `rl-${i}@example.com`,
            password: 'valid-password-123',
            locale: 'en-US',
          });
      }

      const res = await request(app).post(`${accountBase}/`).send({
        email: 'rl-4@example.com',
        password: 'valid-password-123',
        locale: 'en-US',
      });

      expect(res.status).toBe(429);
    });
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
    it('returns 200 with valid token and password', async () => {
      resetPasswordGetByTokenMock.mockResolvedValueOnce({
        account: { id: TEST_USER_ID },
      });
      resetPasswordMock.mockResolvedValueOnce({});

      const res = await request(app)
        .post(`${accountBase}/reset-password`)
        .send({ token: 'valid-reset-token', password: 'new-password-123' });

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('Password reset successfully');
      expect(resetPasswordMock).toHaveBeenCalledWith(TEST_USER_ID, 'new-password-123');
    });

    it('returns 400 with invalid token', async () => {
      resetPasswordGetByTokenMock.mockResolvedValueOnce(null);

      const res = await request(app)
        .post(`${accountBase}/reset-password`)
        .send({ token: 'invalid-token', password: 'new-password-123' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid or expired reset password token');
    });

    it('returns 400 with password too short', async () => {
      const res = await request(app)
        .post(`${accountBase}/reset-password`)
        .send({ token: 'some-token', password: 'short' });

      expect(res.status).toBe(400);
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
