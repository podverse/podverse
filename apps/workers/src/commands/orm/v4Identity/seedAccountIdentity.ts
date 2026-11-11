import { randomUUID } from 'node:crypto';

import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';
import { Client } from 'pg';

import { SharableStatusEnum } from '@podverse/helpers';
import {
  Account,
  AccountCredentials,
  AccountProfile,
  getDataSourceReadWrite,
  isPostgresUniqueViolation,
  isValidNanoIdV2IdText,
} from '@podverse/orm';

import type { IdentitySeedAction, V4IdentitySource } from './seedAccountIdentityLib.js';
import { decideIdentitySeed, parseV4IdentityRow } from './seedAccountIdentityLib.js';

export const V4_SEED_ACCOUNT_IDENTITY_HELP = `v4SeedAccountIdentity

Copy one v4 account into v5: email, bcrypt hash, name, verified flag, and the
v4 id as account.id_text. Does not copy a library, set a membership tier, or
start a trial. v4_library_copied_at stays null.

Flags:
  --v4-id id    v4 users.id (required)
  --dry-run     Decide create or skip; do not write
  --help        Show this text

Requires V4_DATABASE_URL plus the Base and ORM worker env. An email that
already exists is left unchanged. An id that already belongs to a different
account is not reused. The log line is the id and the action, never the email
or the password hash.
`;

const SOURCE_SQL = `
SELECT id AS id_text,
       email,
       NULLIF(btrim(name), '') AS display_name,
       "emailVerified" AS verified,
       password AS password_hash
FROM users
WHERE id = $1
`;

function hasOption(args: CommandLineArgs, name: string): boolean {
  return Object.prototype.hasOwnProperty.call(args, name);
}

function optionValue(args: CommandLineArgs, name: string): string | null {
  const value = args[name];
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  return trimmed;
}

type SourceQueryRow = {
  id_text: string;
  email: string | null;
  display_name: string | null;
  verified: boolean | null;
  password_hash: string | null;
};

async function readV4Identity(connectionString: string, v4Id: string): Promise<SourceQueryRow> {
  const client = new Client({ connectionString });
  try {
    await client.connect();
    const result = await client.query<SourceQueryRow>(SOURCE_SQL, [v4Id]);
    const row = result.rows[0];
    if (result.rows.length !== 1 || row === undefined) {
      throw new Error('No v4 account for that id.');
    }
    return row;
  } catch (error) {
    if (error instanceof Error && error.message === 'No v4 account for that id.') {
      throw error;
    }
    throw new Error('Could not read the v4 account.', { cause: error });
  } finally {
    await client.end().catch(() => undefined);
  }
}

async function findAccountIdByEmail(email: string): Promise<number | null> {
  const rows = await getDataSourceReadWrite()
    .getRepository(AccountCredentials)
    .createQueryBuilder('credentials')
    .select(['credentials.account_id'])
    .where('LOWER(BTRIM(credentials.email)) = :email', { email })
    .getMany();
  const ids = [...new Set(rows.map((row) => row.account_id))];
  if (ids.length > 1) {
    throw new Error('More than one v5 account uses that email.');
  }
  return ids[0] ?? null;
}

async function findAccountIdByIdText(idText: string): Promise<number | null> {
  const account = await getDataSourceReadWrite().getRepository(Account).findOne({
    where: { id_text: idText },
  });
  return account?.id ?? null;
}

async function createIdentity(source: V4IdentitySource): Promise<void> {
  await getDataSourceReadWrite().transaction(async (manager) => {
    const saved = await manager.getRepository(Account).save(
      manager.getRepository(Account).create({
        id_text: source.idText,
        verified: source.verified,
        sharable_status_id: SharableStatusEnum.Private,
        billing_customer_ref: randomUUID(),
        v4_library_copied_at: null,
      })
    );
    await manager.getRepository(AccountCredentials).save(
      manager.getRepository(AccountCredentials).create({
        account_id: saved.id,
        email: source.email,
        username: null,
        password: source.passwordHash,
      })
    );
    await manager.getRepository(AccountProfile).save(
      manager.getRepository(AccountProfile).create({
        account: saved,
        display_name: source.displayName,
        bio: null,
      })
    );
  });
}

/**
 * Seeds one v4 identity into v5. The log line names the id and the action.
 */
export const v4SeedAccountIdentity = async (args: CommandLineArgs) => {
  if (hasOption(args, 'help')) {
    process.stdout.write(V4_SEED_ACCOUNT_IDENTITY_HELP);
    return;
  }

  const v4Id = optionValue(args, 'v4-id');
  if (v4Id === null) {
    throw new Error('Missing --v4-id. Run with --help for the flags.');
  }
  if (!isValidNanoIdV2IdText(v4Id)) {
    throw new Error('v4 id must be 7–15 characters.');
  }

  const connectionString = process.env.V4_DATABASE_URL?.trim() ?? '';
  if (connectionString === '') {
    throw new Error('Missing V4_DATABASE_URL.');
  }

  const dryRun = hasOption(args, 'dry-run');
  const sourceRow = await readV4Identity(connectionString, v4Id);
  const parsed = parseV4IdentityRow({
    idText: sourceRow.id_text,
    email: sourceRow.email,
    displayName: sourceRow.display_name,
    verified: sourceRow.verified,
    passwordHash: sourceRow.password_hash,
  });
  if (!parsed.ok) {
    getLogger().info('v4 identity seed finished', { dryRun, v4Id, action: parsed.reason });
    return;
  }
  if (parsed.source.idText !== v4Id) {
    throw new Error('v4 id did not match the requested id.');
  }

  const emailAccountId = await findAccountIdByEmail(parsed.source.email);
  const idTextAccountId = await findAccountIdByIdText(v4Id);
  const decision: IdentitySeedAction = decideIdentitySeed({ emailAccountId, idTextAccountId });

  if (decision === 'create' && !dryRun) {
    try {
      await createIdentity(parsed.source);
    } catch (error) {
      if (!isPostgresUniqueViolation(error)) {
        throw new Error('Could not write the v5 identity.', { cause: error });
      }
      getLogger().info('v4 identity seed finished', { dryRun, v4Id, action: 'conflict' });
      return;
    }
  }

  const action = decision === 'create' && dryRun ? 'would_create' : decision;
  getLogger().info('v4 identity seed finished', { dryRun, v4Id, action });
};
