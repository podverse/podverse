import { config } from '@management-api/config/index.js';
import {
  ADMIN_AUTH_COOKIE_NAME,
  signWebSessionToken,
} from '@management-api/lib/auth/sessionTokens.js';
import { TEST_ADMIN_SESSION_ID_TEXT } from '@management-api/test/adminSessionStoreStub.js';
import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';

import { registerSwaggerDocs } from './registerSwaggerDocs.js';

const DOCS_BASE = `${config.api.prefix}${config.api.version}`;
const ADMIN_ID_TEXT = 'pvMgtAu001';

const mockAdmin = {
  id: 1,
  id_text: ADMIN_ID_TEXT,
  admin_account_role_id: 1,
  admin_account_role: { role: 'superuser' },
  admin_account_credentials: {
    email: 'admin@example.com',
    username: null,
  },
  permissions: null,
};

const { getWithRoleAndPermissionsMock } = vi.hoisted(() => ({
  getWithRoleAndPermissionsMock: vi.fn<(id: number) => Promise<typeof mockAdmin | null>>(
    async (id: number) => {
      if (id === 1) {
        return mockAdmin;
      }
      return null;
    }
  ),
}));

vi.mock('@management-api/orm/services/adminAccount.js', () => {
  class AdminAccountService {
    async getWithRoleAndPermissions(id: number) {
      return getWithRoleAndPermissionsMock(id);
    }
  }
  return { AdminAccountService };
});

function docsApp(): express.Express {
  const app = express();
  app.use(cookieParser());
  registerSwaggerDocs(app, DOCS_BASE);
  return app;
}

function sessionCookie(): string {
  const token = signWebSessionToken({
    adminId: 1,
    adminIdText: ADMIN_ID_TEXT,
    sessionIdText: TEST_ADMIN_SESSION_ID_TEXT,
  });
  return `${ADMIN_AUTH_COOKIE_NAME}=${token}`;
}

describe('registerSwaggerDocs', () => {
  it('answers 401 for the page and the spec without a management session', async () => {
    const app = docsApp();

    const htmlResponse = await request(app).get(`${DOCS_BASE}/docs`).expect(401);
    expect(htmlResponse.body).toEqual({ message: 'Unauthorized' });

    const yamlResponse = await request(app).get(`${DOCS_BASE}/docs.yaml`).expect(401);
    expect(yamlResponse.body).toEqual({ message: 'Unauthorized' });
    expect(yamlResponse.text).not.toContain('openapi:');
  });

  it('serves docs for a management session with no third-party script', async () => {
    const app = docsApp();
    const cookie = sessionCookie();

    const htmlResponse = await request(app)
      .get(`${DOCS_BASE}/docs`)
      .set('Cookie', cookie)
      .expect(200);
    expect(htmlResponse.headers['content-type']).toContain('text/html');
    expect(htmlResponse.text).toContain(`${DOCS_BASE}/docs.yaml`);
    expect(htmlResponse.text).toContain(`${DOCS_BASE}/docs/assets/swagger-ui.css`);
    expect(htmlResponse.text).toContain(`${DOCS_BASE}/docs/assets/swagger-ui-bundle.js`);
    expect(htmlResponse.text).not.toContain('unpkg.com');
    expect(htmlResponse.text).not.toContain('https://');

    const yamlResponse = await request(app)
      .get(`${DOCS_BASE}/docs.yaml`)
      .set('Cookie', cookie)
      .expect(200);
    expect(yamlResponse.headers['content-type']).toContain('application/yaml');
    expect(yamlResponse.text).toContain('openapi:');

    const jsResponse = await request(app)
      .get(`${DOCS_BASE}/docs/assets/swagger-ui-bundle.js`)
      .expect(200);
    expect(jsResponse.text).toContain('SwaggerUIBundle');
    await request(app).get(`${DOCS_BASE}/docs/assets/index.html`).expect(404);
  });
});
