import jwt from 'jsonwebtoken';
import { describe, expect, it } from 'vitest';

import {
  classifyAccessJwt,
  classifyRefreshJwt,
  readRequestToken,
  signMobileTokenPair,
  signWebSessionToken,
  verifySessionJwt,
} from './sessionTokens.js';

const ADMIN_ID_TEXT = 'pvMgtAdm001';
const SESSION_ID_TEXT = 'pvMgtSes001';
const MOBILE_SCOPE = 'podverse_management_mobile';
const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';

const identity = { adminId: 7, adminIdText: ADMIN_ID_TEXT, sessionIdText: SESSION_ID_TEXT };
const rejected = { kind: 'rejected' };

describe('signed admin session tokens', () => {
  it('a web token names the session, carries no scope, and classifies only as access', () => {
    const token = signWebSessionToken(identity);
    expect(jwt.decode(token, { complete: true })?.header.alg).toBe('HS256');
    const decoded = verifySessionJwt(token);

    expect(decoded).not.toHaveProperty('scope');
    expect(classifyAccessJwt(decoded)).toEqual({
      kind: 'session',
      claims: expect.objectContaining({
        id: 7,
        id_text: ADMIN_ID_TEXT,
        sid: SESSION_ID_TEXT,
        token_use: 'web',
      }),
    });
    expect(classifyRefreshJwt(decoded)).toEqual(rejected);
  });

  it('a mobile pair carries the session and the mobile scope in both tokens', () => {
    const pair = signMobileTokenPair({ ...identity, refreshTokenId: 'raw-refresh-id' });
    expect(jwt.decode(pair.access_token, { complete: true })?.header.alg).toBe('HS256');
    expect(jwt.decode(pair.refresh_token, { complete: true })?.header.alg).toBe('HS256');
    const access = verifySessionJwt(pair.access_token);
    const refresh = verifySessionJwt(pair.refresh_token);

    expect(pair.token_type).toBe('Bearer');
    expect(pair.access_token_expires_in).toBe(900);
    expect(pair.refresh_token_expires_in).toBe(31536000);
    expect(classifyAccessJwt(access)).toEqual({
      kind: 'session',
      claims: expect.objectContaining({
        sid: SESSION_ID_TEXT,
        scope: MOBILE_SCOPE,
        token_use: 'access',
      }),
    });
    expect(classifyRefreshJwt(refresh)).toEqual({
      kind: 'session',
      claims: expect.objectContaining({
        sid: SESSION_ID_TEXT,
        rid: 'raw-refresh-id',
        scope: MOBILE_SCOPE,
        token_use: 'refresh',
      }),
    });
    expect(classifyAccessJwt(refresh)).toEqual(rejected);
    expect(classifyRefreshJwt(access)).toEqual(rejected);
  });

  it('verification fails closed for a bad signature, garbage, or an expired token', () => {
    const forged = jwt.sign(
      { id: 7, id_text: ADMIN_ID_TEXT, sid: SESSION_ID_TEXT, token_use: 'web' },
      'not-the-secret'
    );
    const expired = jwt.sign(
      { id: 7, id_text: ADMIN_ID_TEXT, sid: SESSION_ID_TEXT, token_use: 'web' },
      JWT_SECRET,
      { expiresIn: -10 }
    );

    expect(verifySessionJwt(forged)).toBeNull();
    expect(verifySessionJwt('not-a-jwt')).toBeNull();
    expect(verifySessionJwt(expired)).toBeNull();
    expect(classifyAccessJwt(verifySessionJwt(forged))).toEqual(rejected);
  });

  it('rejects a token signed with a method other than HS256', () => {
    const otherMethod = jwt.sign(
      { id: 7, id_text: ADMIN_ID_TEXT, sid: SESSION_ID_TEXT, token_use: 'web' },
      JWT_SECRET,
      { algorithm: 'HS384' }
    );
    expect(verifySessionJwt(otherMethod)).toBeNull();
  });
});

describe('classifyAccessJwt', () => {
  const base = { id: 7, id_text: ADMIN_ID_TEXT, sid: SESSION_ID_TEXT };

  it('requires the management mobile scope on a mobile access token', () => {
    expect(classifyAccessJwt({ ...base, token_use: 'access', scope: MOBILE_SCOPE }).kind).toBe(
      'session'
    );
    expect(classifyAccessJwt({ ...base, token_use: 'access' })).toEqual(rejected);
    expect(
      classifyAccessJwt({ ...base, token_use: 'access', scope: 'podverse_app_mobile' })
    ).toEqual(rejected);
  });

  it('rejects a web token that carries any scope claim', () => {
    expect(classifyAccessJwt({ ...base, token_use: 'web' }).kind).toBe('session');
    expect(classifyAccessJwt({ ...base, token_use: 'web', scope: MOBILE_SCOPE })).toEqual(rejected);
    expect(classifyAccessJwt({ ...base, token_use: 'web', scope: 'admin' })).toEqual(rejected);
  });

  it('rejects payloads with no session, a malformed id_text or sid, or no token_use', () => {
    expect(classifyAccessJwt({ id: 7, id_text: ADMIN_ID_TEXT, token_use: 'web' })).toEqual(
      rejected
    );
    expect(
      classifyAccessJwt({
        id: 7,
        id_text: ADMIN_ID_TEXT,
        scope: MOBILE_SCOPE,
        token_use: 'access',
      })
    ).toEqual(rejected);
    expect(classifyAccessJwt({ ...base, sid: 'short', token_use: 'web' })).toEqual(rejected);
    expect(classifyAccessJwt({ ...base, id_text: 'short', token_use: 'web' })).toEqual(rejected);
    expect(classifyAccessJwt(base)).toEqual(rejected);
    expect(classifyAccessJwt({ ...base, id: '7', token_use: 'web' })).toEqual(rejected);
    expect(classifyAccessJwt(null)).toEqual(rejected);
    expect(classifyAccessJwt('token')).toEqual(rejected);
  });
});

describe('classifyRefreshJwt', () => {
  const base = { id: 7, id_text: ADMIN_ID_TEXT, sid: SESSION_ID_TEXT, rid: 'raw' };

  it('requires the management mobile scope', () => {
    expect(classifyRefreshJwt({ ...base, scope: MOBILE_SCOPE, token_use: 'refresh' }).kind).toBe(
      'session'
    );
    expect(classifyRefreshJwt({ ...base, token_use: 'refresh' })).toEqual(rejected);
    expect(
      classifyRefreshJwt({ ...base, scope: 'podverse_app_mobile', token_use: 'refresh' })
    ).toEqual(rejected);
  });

  it('rejects refresh payloads with no session or no refresh id', () => {
    expect(
      classifyRefreshJwt({
        id: 7,
        id_text: ADMIN_ID_TEXT,
        rid: 'raw',
        scope: MOBILE_SCOPE,
        token_use: 'refresh',
      })
    ).toEqual(rejected);
    expect(
      classifyRefreshJwt({
        id: 7,
        id_text: ADMIN_ID_TEXT,
        sid: SESSION_ID_TEXT,
        scope: MOBILE_SCOPE,
        token_use: 'refresh',
      })
    ).toEqual(rejected);
  });
});

describe('readRequestToken', () => {
  it('prefers a bearer header over the auth cookie', () => {
    expect(
      readRequestToken({
        cookies: { pv_mgmt_auth: 'cookie-token' },
        headers: { authorization: 'Bearer header-token' },
      })
    ).toEqual({ token: 'header-token', source: 'bearer' });
  });

  it('reads the pv_mgmt_auth cookie when there is no usable bearer header', () => {
    expect(readRequestToken({ cookies: { pv_mgmt_auth: 'cookie-token' }, headers: {} })).toEqual({
      token: 'cookie-token',
      source: 'cookie',
    });
    expect(
      readRequestToken({
        cookies: { pv_mgmt_auth: 'cookie-token' },
        headers: { authorization: 'Basic abc' },
      })
    ).toEqual({ token: 'cookie-token', source: 'cookie' });
    expect(
      readRequestToken({ cookies: {}, headers: { authorization: 'bearer header-token' } })
    ).toEqual({ token: 'header-token', source: 'bearer' });
  });

  it('returns null with no token, another scheme, an empty bearer, or another cookie', () => {
    expect(readRequestToken({ cookies: undefined, headers: {} })).toBeNull();
    expect(readRequestToken({ cookies: {}, headers: { authorization: 'Basic abc' } })).toBeNull();
    expect(readRequestToken({ cookies: {}, headers: { authorization: 'Bearer ' } })).toBeNull();
    expect(readRequestToken({ cookies: { jwt: 'main-api-token' }, headers: {} })).toBeNull();
    expect(readRequestToken({ cookies: { pv_mgmt_auth: '' }, headers: {} })).toBeNull();
  });
});
