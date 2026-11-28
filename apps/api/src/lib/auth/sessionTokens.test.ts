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

const ACCOUNT_ID_TEXT = 'acctidtext1';
const SESSION_ID_TEXT = 'sessidtext1';
const JWT_SECRET = process.env.AUTH_JWT_SECRET ?? '';

const identity = { accountId: 7, accountIdText: ACCOUNT_ID_TEXT, sessionIdText: SESSION_ID_TEXT };

describe('signed session tokens', () => {
  it('a web token classifies as an access session and not as a refresh session', () => {
    const token = signWebSessionToken(identity);
    expect(jwt.decode(token, { complete: true })?.header.alg).toBe('HS256');
    const decoded = verifySessionJwt(token);

    expect(classifyAccessJwt(decoded)).toEqual({
      kind: 'session',
      claims: expect.objectContaining({
        id: 7,
        id_text: ACCOUNT_ID_TEXT,
        sid: SESSION_ID_TEXT,
        token_use: 'web',
      }),
    });
    expect(classifyRefreshJwt(decoded)).toEqual({ kind: 'rejected' });
  });

  it('a mobile pair carries the session in both tokens and the refresh id in the refresh token', () => {
    const pair = signMobileTokenPair({ ...identity, refreshTokenId: 'raw-refresh-id' });
    expect(jwt.decode(pair.access_token, { complete: true })?.header.alg).toBe('HS256');
    expect(jwt.decode(pair.refresh_token, { complete: true })?.header.alg).toBe('HS256');
    const access = verifySessionJwt(pair.access_token);
    const refresh = verifySessionJwt(pair.refresh_token);

    expect(pair.token_type).toBe('Bearer');
    expect(classifyAccessJwt(access)).toEqual({
      kind: 'session',
      claims: expect.objectContaining({ sid: SESSION_ID_TEXT, token_use: 'access' }),
    });
    expect(classifyRefreshJwt(refresh)).toEqual({
      kind: 'session',
      claims: expect.objectContaining({
        sid: SESSION_ID_TEXT,
        rid: 'raw-refresh-id',
        token_use: 'refresh',
      }),
    });
    expect(classifyAccessJwt(refresh)).toEqual({ kind: 'rejected' });
    expect(classifyRefreshJwt(access)).toEqual({ kind: 'rejected' });
  });

  it('verification fails closed for a bad signature or garbage', () => {
    const forged = jwt.sign(
      { id: 7, id_text: ACCOUNT_ID_TEXT, sid: SESSION_ID_TEXT, token_use: 'web' },
      'not-the-secret'
    );
    expect(verifySessionJwt(forged)).toBeNull();
    expect(verifySessionJwt('not-a-jwt')).toBeNull();
    expect(classifyAccessJwt(verifySessionJwt(forged))).toEqual({ kind: 'rejected' });
  });

  it('verification rejects an expired token', () => {
    const expired = jwt.sign(
      { id: 7, id_text: ACCOUNT_ID_TEXT, sid: SESSION_ID_TEXT, token_use: 'web' },
      JWT_SECRET,
      { expiresIn: -10 }
    );
    expect(verifySessionJwt(expired)).toBeNull();
  });

  it('rejects a token signed with a method other than HS256', () => {
    const otherMethod = jwt.sign(
      { id: 7, id_text: ACCOUNT_ID_TEXT, sid: SESSION_ID_TEXT, token_use: 'web' },
      JWT_SECRET,
      { algorithm: 'HS384' }
    );
    expect(verifySessionJwt(otherMethod)).toBeNull();
  });
});

describe('classifyAccessJwt', () => {
  it('rejects payloads with no session, a malformed session or account id_text, or no token_use', () => {
    const rejected = { kind: 'rejected' };
    expect(classifyAccessJwt({ id: 7, id_text: ACCOUNT_ID_TEXT })).toEqual(rejected);
    expect(classifyAccessJwt({ id: 7, id_text: ACCOUNT_ID_TEXT, token_use: 'web' })).toEqual(
      rejected
    );
    expect(
      classifyAccessJwt({ id: 7, id_text: ACCOUNT_ID_TEXT, sid: 'short', token_use: 'web' })
    ).toEqual(rejected);
    expect(
      classifyAccessJwt({ id: 7, id_text: 'short', sid: SESSION_ID_TEXT, token_use: 'access' })
    ).toEqual(rejected);
    expect(
      classifyAccessJwt({
        id: 7,
        id_text: ACCOUNT_ID_TEXT,
        sid: 'a-session-id-that-is-too-long',
        token_use: 'web',
      })
    ).toEqual(rejected);
    expect(classifyAccessJwt({ id: 7, id_text: ACCOUNT_ID_TEXT, sid: SESSION_ID_TEXT })).toEqual(
      rejected
    );
    expect(classifyAccessJwt(null)).toEqual(rejected);
    expect(classifyAccessJwt('token')).toEqual(rejected);
  });
});

describe('classifyRefreshJwt', () => {
  it('rejects refresh payloads with no session or no refresh id', () => {
    const rejected = { kind: 'rejected' };
    expect(
      classifyRefreshJwt({ id: 7, id_text: ACCOUNT_ID_TEXT, rid: 'raw', token_use: 'refresh' })
    ).toEqual(rejected);
    expect(
      classifyRefreshJwt({
        id: 7,
        id_text: ACCOUNT_ID_TEXT,
        sid: SESSION_ID_TEXT,
        token_use: 'refresh',
      })
    ).toEqual(rejected);
    expect(classifyRefreshJwt({ id: 7, id_text: ACCOUNT_ID_TEXT, token_use: 'refresh' })).toEqual(
      rejected
    );
  });
});

describe('readRequestToken', () => {
  it('prefers the auth cookie over a bearer header', () => {
    expect(
      readRequestToken({
        cookies: { jwt: 'cookie-token' },
        headers: { authorization: 'Bearer header-token' },
      })
    ).toEqual({ token: 'cookie-token', source: 'cookie' });
  });

  it('reads a bearer header when there is no auth cookie', () => {
    expect(
      readRequestToken({ cookies: {}, headers: { authorization: 'Bearer header-token' } })
    ).toEqual({ token: 'header-token', source: 'bearer' });
    expect(
      readRequestToken({ cookies: { jwt: '' }, headers: { authorization: 'bearer header-token' } })
    ).toEqual({ token: 'header-token', source: 'bearer' });
  });

  it('reads a bearer value with the key prefix as an API key, well-formed or not', () => {
    const wellFormed = `pvk_${'a'.repeat(43)}`;
    expect(
      readRequestToken({ cookies: {}, headers: { authorization: `Bearer ${wellFormed}` } })
    ).toEqual({ token: wellFormed, source: 'api_key' });
    expect(readRequestToken({ cookies: {}, headers: { authorization: 'Bearer pvk_x' } })).toEqual({
      token: 'pvk_x',
      source: 'api_key',
    });
  });

  it('prefers the auth cookie over an API key header', () => {
    expect(
      readRequestToken({
        cookies: { jwt: 'cookie-token' },
        headers: { authorization: `Bearer pvk_${'a'.repeat(43)}` },
      })
    ).toEqual({ token: 'cookie-token', source: 'cookie' });
  });

  it('reads a session JWT in the bearer header as a bearer token', () => {
    const token = signWebSessionToken(identity);
    expect(
      readRequestToken({ cookies: {}, headers: { authorization: `Bearer ${token}` } })
    ).toEqual({ token, source: 'bearer' });
  });

  it('returns null with no token, another scheme, or an empty bearer', () => {
    expect(readRequestToken({ cookies: undefined, headers: {} })).toBeNull();
    expect(readRequestToken({ cookies: {}, headers: { authorization: 'Basic abc' } })).toBeNull();
    expect(readRequestToken({ cookies: {}, headers: { authorization: 'Bearer ' } })).toBeNull();
  });
});
