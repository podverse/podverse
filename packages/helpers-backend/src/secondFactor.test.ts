import { describe, expect, it } from 'vitest';

import type {
  SecondFactorChallenge,
  SecondFactorChallengeRepository,
  SecondFactorDeps,
  SecondFactorRecord,
  SecondFactorRepository,
} from './secondFactor.js';
import {
  clearSecondFactor,
  codeMatchesFactor,
  confirmEnrollment,
  continueAfterPassword,
  hashBackupCode,
  issueEmailCode,
  openSecondFactorSecret,
  sealSecondFactorSecret,
  submitLoginCode,
  totpCodeAt,
  verifyTotpCode,
} from './secondFactor.js';

const KEY = 'ab'.repeat(32);
const NOW = 1_700_000_000_000;

function memoryRepository(): SecondFactorRepository & { record: SecondFactorRecord | null } {
  const backup: Array<{ id: number; codeHash: string; used: boolean }> = [];
  let nextId = 1;
  const state: { record: SecondFactorRecord | null } = { record: null };

  return {
    get record() {
      return state.record;
    },
    set record(value) {
      state.record = value;
    },
    async find() {
      return state.record;
    },
    async saveInitial(_ownerId, ciphertext) {
      state.record = {
        secretCiphertext: ciphertext,
        pendingSecretCiphertext: null,
        confirmedAt: null,
      };
    },
    async savePending(_ownerId, ciphertext) {
      if (!state.record) {
        throw new Error('missing');
      }
      state.record = { ...state.record, pendingSecretCiphertext: ciphertext };
    },
    async markConfirmed(_ownerId, now) {
      if (!state.record) {
        throw new Error('missing');
      }
      state.record = { ...state.record, confirmedAt: now };
    },
    async promotePending(_ownerId, now) {
      if (!state.record?.pendingSecretCiphertext) {
        throw new Error('missing');
      }
      state.record = {
        secretCiphertext: state.record.pendingSecretCiphertext,
        pendingSecretCiphertext: null,
        confirmedAt: now,
      };
    },
    async replaceBackupCodes(_ownerId, codeHashes) {
      backup.length = 0;
      for (const codeHash of codeHashes) {
        backup.push({ id: nextId, codeHash, used: false });
        nextId += 1;
      }
    },
    async unusedBackupHashes() {
      return backup.filter((row) => !row.used).map((row) => ({ id: row.id, codeHash: row.codeHash }));
    },
    async markBackupUsed(id) {
      const row = backup.find((item) => item.id === id && !item.used);
      if (!row) {
        return false;
      }
      row.used = true;
      return true;
    },
    async clear() {
      state.record = null;
      backup.length = 0;
    },
  };
}

function memoryChallenges(): SecondFactorChallengeRepository & {
  map: Map<string, SecondFactorChallenge>;
} {
  const map = new Map<string, SecondFactorChallenge>();
  return {
    map,
    async save(tokenHash, challenge) {
      map.set(tokenHash, challenge);
    },
    async read(tokenHash) {
      return map.get(tokenHash) ?? null;
    },
    async remove(tokenHash) {
      map.delete(tokenHash);
    },
  };
}

function deps(options: {
  mode: 'optional' | 'required';
  repository: SecondFactorRepository;
  challenges: SecondFactorChallengeRepository;
  emailSends?: { count: number };
}): SecondFactorDeps {
  return {
    mode: () => options.mode,
    keyHex: () => KEY,
    issuer: () => 'PodverseTest',
    repository: options.repository,
    challenges: options.challenges,
    emailRateLimit: {
      async consume() {
        const sends = options.emailSends ?? { count: 0 };
        sends.count += 1;
        if (sends.count > 3) {
          return { allowed: false, retryAfterMs: 60_000 };
        }
        return { allowed: true };
      },
    },
    nowMs: () => NOW,
    qrDataUrl: async () => 'data:image/png;base64,dGVzdA==',
  };
}

describe('second factor secret', () => {
  it('opens only for the owner that sealed it', () => {
    const sealed = sealSecondFactorSecret('SECRET', KEY, 7);
    expect(openSecondFactorSecret(sealed, KEY, 7)).toBe('SECRET');
    expect(openSecondFactorSecret(sealed, KEY, 8)).toBeNull();
  });

  it('accepts the current code and the neighboring step', () => {
    const secret = 'JBSWY3DPEHPK3PXP';
    const code = totpCodeAt(secret, NOW);
    expect(verifyTotpCode(secret, code, NOW)).toBe(true);
    expect(verifyTotpCode(secret, code, NOW + 30_000)).toBe(true);
    expect(verifyTotpCode(secret, '000000', NOW)).toBe(false);
  });
});

describe('second factor login', () => {
  it('returns a session when the factor is off and optional', async () => {
    const repository = memoryRepository();
    const challenges = memoryChallenges();
    const result = await continueAfterPassword(deps({ mode: 'optional', repository, challenges }), {
      ownerId: 4,
      client: 'web',
      deviceLabel: null,
    });
    expect(result.kind).toBe('session');
    expect(challenges.map.size).toBe(0);
  });

  it('returns a setup token when required and the authenticator is not confirmed', async () => {
    const repository = memoryRepository();
    const challenges = memoryChallenges();
    const result = await continueAfterPassword(deps({ mode: 'required', repository, challenges }), {
      ownerId: 4,
      client: 'mobile',
      deviceLabel: 'Pixel',
    });
    expect(result.kind).toBe('setup');
    if (result.kind !== 'setup') {
      return;
    }
    expect(result.setupToken.length).toBeGreaterThan(10);
  });

  it('does not accept a wrong code, and burns the challenge on the fifth miss', async () => {
    const repository = memoryRepository();
    const challenges = memoryChallenges();
    const flow = deps({ mode: 'optional', repository, challenges });
    await repository.saveInitial(4, sealSecondFactorSecret('JBSWY3DPEHPK3PXP', KEY, 4));
    await repository.markConfirmed(4, new Date(NOW));
    const issued = await continueAfterPassword(flow, {
      ownerId: 4,
      client: 'web',
      deviceLabel: null,
    });
    if (issued.kind !== 'code') {
      throw new Error('expected a code challenge');
    }
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const failed = await submitLoginCode(flow, {
        challengeToken: issued.challengeToken,
        code: '000000',
      });
      expect(failed).toEqual({ ok: false, burned: false });
    }
    const burned = await submitLoginCode(flow, {
      challengeToken: issued.challengeToken,
      code: '000000',
    });
    expect(burned).toEqual({ ok: false, burned: true });
    const after = await submitLoginCode(flow, {
      challengeToken: issued.challengeToken,
      code: totpCodeAt('JBSWY3DPEHPK3PXP', NOW),
    });
    expect(after).toEqual({ ok: false, burned: true });
  });

  it('starts a success result only after the app code matches', async () => {
    const repository = memoryRepository();
    const challenges = memoryChallenges();
    const flow = deps({ mode: 'required', repository, challenges });
    const { beginEnrollment } = await import('./secondFactor.js');
    const started = await beginEnrollment(flow, { ownerId: 9, accountName: 'ada@example.com' });
    const confirmed = await confirmEnrollment(flow, {
      ownerId: 9,
      code: totpCodeAt(started.manualKey, NOW),
    });
    expect(confirmed.ok).toBe(true);
    if (!confirmed.ok) {
      return;
    }
    expect(confirmed.backupCodes).toHaveLength(10);
    const issued = await continueAfterPassword(flow, {
      ownerId: 9,
      client: 'web',
      deviceLabel: null,
    });
    if (issued.kind !== 'code') {
      throw new Error('expected a code challenge');
    }
    const wrong = await submitLoginCode(flow, {
      challengeToken: issued.challengeToken,
      code: '111111',
    });
    expect(wrong.ok).toBe(false);
    const right = await submitLoginCode(flow, {
      challengeToken: issued.challengeToken,
      code: totpCodeAt(started.manualKey, NOW),
    });
    expect(right.ok).toBe(true);
  });

  it('stops email codes after the cap and still accepts an app code', async () => {
    const repository = memoryRepository();
    const challenges = memoryChallenges();
    const sends = { count: 0 };
    const flow = deps({ mode: 'optional', repository, challenges, emailSends: sends });
    const secret = 'JBSWY3DPEHPK3PXP';
    await repository.saveInitial(3, sealSecondFactorSecret(secret, KEY, 3));
    await repository.markConfirmed(3, new Date(NOW));
    const issued = await continueAfterPassword(flow, {
      ownerId: 3,
      client: 'web',
      deviceLabel: null,
    });
    if (issued.kind !== 'code') {
      throw new Error('expected a code challenge');
    }
    for (let send = 0; send < 3; send += 1) {
      const result = await issueEmailCode(flow, {
        challengeToken: issued.challengeToken,
        ip: '127.0.0.1',
      });
      expect(result.status).toBe('code');
    }
    const limited = await issueEmailCode(flow, {
      challengeToken: issued.challengeToken,
      ip: '127.0.0.1',
    });
    expect(limited.status).toBe('rate_limited');
    const app = await submitLoginCode(flow, {
      challengeToken: issued.challengeToken,
      code: totpCodeAt(secret, NOW),
    });
    expect(app.ok).toBe(true);
  });

  it('accepts one backup code and then clears the factor', async () => {
    const repository = memoryRepository();
    const challenges = memoryChallenges();
    const flow = deps({ mode: 'optional', repository, challenges });
    const secret = 'JBSWY3DPEHPK3PXP';
    await repository.saveInitial(3, sealSecondFactorSecret(secret, KEY, 3));
    await repository.markConfirmed(3, new Date(NOW));
    await repository.replaceBackupCodes(3, [hashBackupCode('ABCD-EFGH')]);
    const issued = await continueAfterPassword(flow, {
      ownerId: 3,
      client: 'mobile',
      deviceLabel: null,
    });
    if (issued.kind !== 'code') {
      throw new Error('expected a code challenge');
    }
    const used = await submitLoginCode(flow, {
      challengeToken: issued.challengeToken,
      code: 'abcd efgh',
    });
    expect(used.ok).toBe(true);
    expect(await codeMatchesFactor(flow, 3, 'ABCD-EFGH')).toBe(false);
    await clearSecondFactor(flow, 3);
    expect(await repository.find(3)).toBeNull();
  });
});
