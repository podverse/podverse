/**
 * Load before any app modules so `@mgmt-api/config` reads valid test env (see vitest.config.ts setupFiles).
 */
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.BRAND_NAME = 'VitestBrand';
process.env.USER_AGENT = '';
process.env.AUTH_JWT_SECRET = '11111111-1111-4111-8111-111111111111';
process.env.API_PORT = '19999';
process.env.API_PREFIX = '/api';
process.env.API_VERSION = '/v1';
process.env.COOKIE_DOMAIN = 'localhost';
process.env.API_ALLOWED_CORS_ORIGINS = 'http://localhost:3000';
process.env.WEB_PROTOCOL = 'http';
process.env.WEB_DOMAIN = 'localhost';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '5432';
process.env.DB_READ_USERNAME = 'test';
process.env.DB_READ_PASSWORD = 'test';
process.env.DB_READ_WRITE_USERNAME = 'test';
process.env.DB_READ_WRITE_PASSWORD = 'test';
process.env.DB_DATABASE = 'test';
