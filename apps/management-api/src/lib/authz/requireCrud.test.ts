import { requireCrud } from '@mgmt-api/lib/authz/requireCrud.js';
import type { NextFunction, Request, Response } from 'express';
import { describe, expect, it, vi } from 'vitest';

function createMockReq(user?: Express.User): Partial<Request> {
  return { user };
}

function createMockRes(): {
  res: Partial<Response>;
  json: ReturnType<typeof vi.fn>;
  status: ReturnType<typeof vi.fn>;
} {
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });
  return { res: { status: status as unknown as Response['status'], json }, json, status };
}

function createMockNext(): NextFunction {
  return vi.fn();
}

describe('requireCrud', () => {
  it('returns 401 when no user is authenticated', () => {
    const middleware = requireCrud('admins', 'read');
    const req = createMockReq() as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    middleware(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows superuser regardless of permissions', () => {
    const middleware = requireCrud('admins', 'read');
    const req = createMockReq({
      id: 1,
      id_text: 'su',
      admin_account_role_id: 1,
      role: 'superuser',
      permissions: null,
    }) as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when non-superuser has no permissions', () => {
    const middleware = requireCrud('admins', 'read');
    const req = createMockReq({
      id: 2,
      id_text: 'admin',
      admin_account_role_id: 2,
      role: 'admin',
      permissions: null,
    }) as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    middleware(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when permission bit is not set', () => {
    const middleware = requireCrud('admins', 'create');
    const req = createMockReq({
      id: 2,
      id_text: 'admin',
      admin_account_role_id: 2,
      role: 'admin',
      permissions: {
        feeds_crud: 0,
        feed_takedown_reasons_crud: 0,
        admins_crud: 2, // read only
        stats_crud: 0,
        billing_prices_crud: 0,
        bucket_crud: 0,
      },
    }) as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    middleware(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows when permission bit is set', () => {
    const middleware = requireCrud('admins', 'read');
    const req = createMockReq({
      id: 2,
      id_text: 'admin',
      admin_account_role_id: 2,
      role: 'admin',
      permissions: {
        feeds_crud: 0,
        feed_takedown_reasons_crud: 0,
        admins_crud: 2, // read only
        stats_crud: 0,
        billing_prices_crud: 0,
        bucket_crud: 0,
      },
    }) as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('checks correct resource column', () => {
    const middleware = requireCrud('feeds', 'read');
    const req = createMockReq({
      id: 2,
      id_text: 'admin',
      admin_account_role_id: 2,
      role: 'admin',
      permissions: {
        feeds_crud: 2, // read
        feed_takedown_reasons_crud: 0,
        admins_crud: 0,
        stats_crud: 0,
        billing_prices_crud: 0,
        bucket_crud: 0,
      },
    }) as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('checks billing price CRUD resource column', () => {
    const middleware = requireCrud('billing_prices', 'update');
    const req = createMockReq({
      id: 2,
      id_text: 'admin',
      admin_account_role_id: 2,
      role: 'admin',
      permissions: {
        feeds_crud: 0,
        feed_takedown_reasons_crud: 0,
        admins_crud: 0,
        stats_crud: 0,
        billing_prices_crud: 4,
        bucket_crud: 0,
      },
    }) as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('checks bucket CRUD resource column', () => {
    const middleware = requireCrud('bucket', 'read');
    const req = createMockReq({
      id: 2,
      id_text: 'admin',
      admin_account_role_id: 2,
      role: 'admin',
      permissions: {
        feeds_crud: 0,
        feed_takedown_reasons_crud: 0,
        admins_crud: 0,
        stats_crud: 0,
        billing_prices_crud: 0,
        bucket_crud: 2,
      },
    }) as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
  });

  it('checks extensions CRUD resource column', () => {
    const middleware = requireCrud('extensions', 'update');
    const req = createMockReq({
      id: 2,
      id_text: 'admin',
      admin_account_role_id: 2,
      role: 'admin',
      permissions: {
        feeds_crud: 0,
        feed_takedown_reasons_crud: 0,
        admins_crud: 0,
        stats_crud: 0,
        billing_prices_crud: 0,
        bucket_crud: 0,
        extensions_crud: 4,
      },
    }) as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    middleware(req, res as Response, next);

    expect(next).toHaveBeenCalled();
  });
});
