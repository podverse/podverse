import { requireSuperuser } from '@mgmt-api/lib/authz/requireSuperuser.js';
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

describe('requireSuperuser', () => {
  it('returns 401 when no user is authenticated', () => {
    const req = createMockReq() as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    requireSuperuser(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 for non-superuser', () => {
    const req = createMockReq({
      id: 2,
      id_text: 'admin',
      admin_account_role_id: 2,
      role: 'admin',
      permissions: null,
    }) as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    requireSuperuser(req, res as Response, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('allows superuser through', () => {
    const req = createMockReq({
      id: 1,
      id_text: 'su',
      admin_account_role_id: 1,
      role: 'superuser',
      permissions: null,
    }) as Request;
    const { res } = createMockRes();
    const next = createMockNext();

    requireSuperuser(req, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });
});
