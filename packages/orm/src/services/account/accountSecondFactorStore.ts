import { AppDataSourceReadWrite } from '@orm/db/index.js';

import type { SecondFactorRecord, SecondFactorRepository } from '@podverse/helpers-backend';

function returnedRows(result: unknown): unknown[] {
  if (!Array.isArray(result)) {
    return [];
  }
  if (result.length === 2 && Array.isArray(result[0]) && typeof result[1] === 'number') {
    return result[0];
  }
  return result;
}

function asRow(value: unknown): object | null {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value;
  }
  return null;
}

function textColumn(row: object, name: string): string | null {
  const value: unknown = Reflect.get(row, name);
  return typeof value === 'string' ? value : null;
}

function dateColumn(row: object, name: string): Date | null {
  const value: unknown = Reflect.get(row, name);
  if (value instanceof Date) {
    return value;
  }
  if (typeof value === 'string' && value !== '') {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  return null;
}

function idColumn(row: object): number | null {
  const value: unknown = Reflect.get(row, 'id');
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }
  if (typeof value === 'string' && /^\d+$/u.test(value)) {
    return Number(value);
  }
  return null;
}

function readRecord(value: unknown): SecondFactorRecord | null {
  const row = asRow(value);
  if (row === null) {
    return null;
  }
  const secretCiphertext = textColumn(row, 'secret_ciphertext');
  if (secretCiphertext === null) {
    return null;
  }
  return {
    secretCiphertext,
    pendingSecretCiphertext: textColumn(row, 'pending_secret_ciphertext'),
    confirmedAt: dateColumn(row, 'confirmed_at'),
  };
}

export function createAccountSecondFactorRepository(): SecondFactorRepository {
  const query = (sql: string, parameters: readonly unknown[]) =>
    AppDataSourceReadWrite.manager.query(sql, [...parameters]);

  return {
    async find(ownerId) {
      const result: unknown = await query(
        `SELECT secret_ciphertext, pending_secret_ciphertext, confirmed_at
           FROM account_second_factor
          WHERE account_id = $1`,
        [ownerId]
      );
      return readRecord(returnedRows(result)[0]);
    },
    async saveInitial(ownerId, ciphertext) {
      await query(
        `INSERT INTO account_second_factor (account_id, secret_ciphertext)
         VALUES ($1, $2)
         ON CONFLICT (account_id) DO UPDATE
            SET secret_ciphertext = EXCLUDED.secret_ciphertext,
                pending_secret_ciphertext = NULL,
                confirmed_at = NULL,
                updated_at = now()
          WHERE account_second_factor.confirmed_at IS NULL`,
        [ownerId, ciphertext]
      );
    },
    async savePending(ownerId, ciphertext) {
      await query(
        `UPDATE account_second_factor
            SET pending_secret_ciphertext = $2, updated_at = now()
          WHERE account_id = $1 AND confirmed_at IS NOT NULL`,
        [ownerId, ciphertext]
      );
    },
    async markConfirmed(ownerId, now) {
      await query(
        `UPDATE account_second_factor
            SET confirmed_at = $2, updated_at = now()
          WHERE account_id = $1 AND confirmed_at IS NULL`,
        [ownerId, now]
      );
    },
    async promotePending(ownerId, now) {
      await query(
        `UPDATE account_second_factor
            SET secret_ciphertext = pending_secret_ciphertext,
                pending_secret_ciphertext = NULL,
                confirmed_at = $2,
                updated_at = now()
          WHERE account_id = $1 AND pending_secret_ciphertext IS NOT NULL`,
        [ownerId, now]
      );
    },
    async replaceBackupCodes(ownerId, codeHashes) {
      await AppDataSourceReadWrite.transaction(async (manager) => {
        await manager.query(
          `DELETE FROM account_second_factor_backup_code WHERE account_id = $1`,
          [ownerId]
        );
        for (const codeHash of codeHashes) {
          await manager.query(
            `INSERT INTO account_second_factor_backup_code (account_id, code_hash)
             VALUES ($1, $2)`,
            [ownerId, codeHash]
          );
        }
      });
    },
    async unusedBackupHashes(ownerId) {
      const result: unknown = await query(
        `SELECT id, code_hash
           FROM account_second_factor_backup_code
          WHERE account_id = $1 AND used_at IS NULL
          ORDER BY id`,
        [ownerId]
      );
      const hashes: Array<{ id: number; codeHash: string }> = [];
      for (const value of returnedRows(result)) {
        const row = asRow(value);
        if (row === null) {
          continue;
        }
        const id = idColumn(row);
        const codeHash = textColumn(row, 'code_hash');
        if (id === null || codeHash === null) {
          continue;
        }
        hashes.push({ id, codeHash });
      }
      return hashes;
    },
    async markBackupUsed(id, now) {
      const result: unknown = await query(
        `UPDATE account_second_factor_backup_code
            SET used_at = $2
          WHERE id = $1 AND used_at IS NULL
          RETURNING id`,
        [id, now]
      );
      return returnedRows(result).length > 0;
    },
    async clear(ownerId) {
      await query(`DELETE FROM account_second_factor WHERE account_id = $1`, [ownerId]);
    },
  };
}
