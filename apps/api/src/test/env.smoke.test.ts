import { describe, expect, it } from 'vitest';

describe('API test environment', () => {
  it('has test DB port configured (not dev port 5432)', () => {
    expect(process.env.DB_PORT).toBe('5732');
    expect(process.env.DB_DATABASE).toBe('podverse_app_test');
  });

  it('has test env vars set', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.AUTH_JWT_SECRET).toBeDefined();
    expect(process.env.API_PORT).toBeDefined();
  });
});
