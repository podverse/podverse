import type { NextFunction, Request, Response } from 'express';
import Joi from 'joi';
import { describe, expect, it, vi } from 'vitest';

import {
  validateBodyObject,
  validateParamsObject,
  validateQueryObject,
} from './requestValidation.js';

function mockResponse(): Response {
  return {
    status: vi.fn().mockReturnThis(),
    json: vi.fn(),
  } as unknown as Response;
}

describe('validateBodyObject (PVSA-007 stripUnknown)', () => {
  it('strips unexpected body keys and calls next on valid payloads', () => {
    const schema = Joi.object({
      title: Joi.string().required(),
    });

    const req = {
      body: { title: 'ok', isAdmin: true, nested: { x: 1 } },
    } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    validateBodyObject(schema, req, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(req.body).toEqual({ title: 'ok' });
  });

  it('returns 400 when required fields are missing after strip', () => {
    const schema = Joi.object({
      title: Joi.string().required(),
    });

    const req = {
      body: { extraOnly: 'x' },
    } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    validateBodyObject(schema, req, res, next);

    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('still coerces position1 string to number before validation', () => {
    const schema = Joi.object({
      position1: Joi.number().required(),
    });

    const req = {
      body: { position1: '3.5' },
    } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    validateBodyObject(schema, req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.body).toEqual({ position1: 3.5 });
  });
});

describe('validateParamsObject (PVSA-007 stripUnknown)', () => {
  it('replaces params so stripped keys do not linger on req.params', () => {
    const schema = Joi.object({
      id: Joi.string().required(),
    });

    const req = {
      params: { id: 'abc', impersonateUserId: 'evil' },
    } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    validateParamsObject(schema, req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.params).toEqual({ id: 'abc' });
  });
});

describe('validateQueryObject (PVSA-007 stripUnknown)', () => {
  it('strips unexpected query keys by default', () => {
    const schema = Joi.object({
      page: Joi.string(),
    });

    const req = {
      query: { page: '1', token: 'secret', inject: ['a', 'b'] },
    } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    validateQueryObject(schema, req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query).toEqual({ page: '1' });
  });

  it('preserves extra query keys when schema uses .unknown(true) (live item lists)', () => {
    const schema = Joi.object({
      liveItemType: Joi.string().required(),
    }).unknown(true);

    const req = {
      query: {
        liveItemType: 'podcastLive',
        sortField: 'topPastWeek',
        page: '2',
      },
    } as unknown as Request;
    const res = mockResponse();
    const next = vi.fn() as NextFunction;

    validateQueryObject(schema, req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.query).toEqual({
      liveItemType: 'podcastLive',
      sortField: 'topPastWeek',
      page: '2',
    });
  });
});
