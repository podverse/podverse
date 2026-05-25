import 'reflect-metadata';

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'error';
process.env.BRAND_NAME = 'VitestBrand';
process.env.USER_AGENT = 'Example Bot test/Management-API/5';
process.env.AUTH_JWT_SECRET = '11111111-1111-4111-8111-111111111111';
process.env.API_PORT = '19999';
process.env.API_PREFIX = '/api';
process.env.API_VERSION = '/v2';
process.env.API_RELEASE = 'test-release';
process.env.COOKIE_DOMAIN = 'localhost';
process.env.API_ALLOWED_CORS_ORIGINS = 'http://localhost:3000';
process.env.APP_WEB_PROTOCOL = 'http';
process.env.APP_WEB_DOMAIN = 'localhost';
process.env.MANAGEMENT_WEB_PROTOCOL = 'http';
process.env.MANAGEMENT_WEB_DOMAIN = 'localhost';
process.env.DB_HOST = '127.0.0.1';
process.env.DB_PORT = '5732';
process.env.DB_APP_NAME = 'podverse_app_test';
process.env.DB_APP_READ_USER = 'podverse_app_read';
process.env.DB_APP_READ_PASSWORD = 'test';
process.env.DB_APP_READ_WRITE_USER = 'podverse_app_read_write';
process.env.DB_APP_READ_WRITE_PASSWORD = 'test';
process.env.DB_MANAGEMENT_NAME = 'podverse_management_test';
process.env.DB_MANAGEMENT_READ_USER = 'podverse_management_read';
process.env.DB_MANAGEMENT_READ_PASSWORD = 'test';
process.env.DB_MANAGEMENT_READ_WRITE_USER = 'podverse_management_read_write';
process.env.DB_MANAGEMENT_READ_WRITE_PASSWORD = 'test';
process.env.LOG_DIR = process.env.LOG_DIR ?? '';
process.env.PROMETHEUS_ENABLED = process.env.PROMETHEUS_ENABLED ?? 'false';
process.env.OTEL_SERVICE_NAME = process.env.OTEL_SERVICE_NAME ?? 'podverse-management-api';
process.env.OTEL_TRACES_EXPORT = process.env.OTEL_TRACES_EXPORT ?? 'none';
process.env.OTEL_EXPORTER_OTLP_ENDPOINT = process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? '';

import { initObservability } from '@podverse/observability';
import { buildObservabilityConfigFromEnv } from '@podverse/observability/config';

initObservability(buildObservabilityConfigFromEnv(process.env));
