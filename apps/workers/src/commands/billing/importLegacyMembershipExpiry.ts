import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import type { CommandLineArgs } from '@workers/commands/index.js';
import { getLogger } from '@workers/factories/logger.js';

import {
  AccountCredentials,
  BillingEntitlementService,
  BillingMembershipGrant,
  BillingMembershipGrantService,
  getDataSourceReadWrite,
} from '@podverse/orm';

import type { LegacyMembershipExpiryImportDeps } from './importLegacyMembershipExpiryLib.js';
import {
  formatLegacyMembershipImportReport,
  importLegacyMembershipExpiryFromText,
  selectLegacyImportGrant,
} from './importLegacyMembershipExpiryLib.js';

export const LEGACY_MEMBERSHIP_EXPIRY_HELP = `billingImportLegacyMembershipExpiry

Import membership expiry from the previous Podverse app as legacy_import grants.
Reads email and membership_expires_at only. Does not import payments or create
PayPal, Apple, or Google subscriptions, and does not email anyone.

CSV:
email,membership_expires_at
user@example.com,2027-01-15T00:00:00.000Z

JSON lines (one object per line) use the same two fields.
Timestamps are ISO-8601 UTC, or YYYY-MM-DD read as UTC midnight.

Flags:
  --file path     CSV or JSON-lines file (required)
  --dry-run       Count what would change; do not write grants
  --report path   Write unmatched and skipped rows (CSV)
  --help          Show this text

Email matching is case-insensitive. A row with no account, or with more than one
account, is reported and skipped. A missing or past expiry is skipped. When a
legacy_import grant already exists, ends_at moves later only when the file's
expiry is later. A revoked grant stays revoked; the import does not add a second
grant for that account. Each create or update recomputes that account.

Paths resolve from the current working directory. npm run -w apps/workers uses
apps/workers as that directory; pass an absolute path.
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

function legacyMembershipExpiryDeps(dryRun: boolean): LegacyMembershipExpiryImportDeps {
  return {
    now: new Date(),
    dryRun,
    matchAccount: async (normalizedEmail) => {
      const rows = await getDataSourceReadWrite()
        .getRepository(AccountCredentials)
        .createQueryBuilder('credentials')
        .select(['credentials.id', 'credentials.account_id'])
        .where('LOWER(BTRIM(credentials.email)) = :email', { email: normalizedEmail })
        .getMany();
      const accountIds = [...new Set(rows.map((row) => row.account_id))];
      const accountId = accountIds[0];
      if (accountIds.length === 0 || accountId === undefined) {
        return { status: 'unmatched' };
      }
      if (accountIds.length > 1) {
        return { status: 'ambiguous' };
      }
      return { status: 'matched', accountId };
    },
    findLegacyImport: async (accountId) => {
      const grants = await getDataSourceReadWrite()
        .getRepository(BillingMembershipGrant)
        .find({
          where: { account_id: accountId, source: 'legacy_import' },
        });
      return selectLegacyImportGrant(
        grants.map((grant) => ({
          id: grant.id,
          endsAt: grant.ends_at,
          revokedAt: grant.revoked_at,
        }))
      );
    },
    createLegacyImport: async (params) => {
      const result = await new BillingMembershipGrantService().createGrant({
        accountId: params.accountId,
        source: params.source,
        startsAt: params.startsAt,
        endsAt: params.endsAt,
      });
      return { id: result.grant.id };
    },
    raiseLegacyImportEnd: async (params) => {
      await getDataSourceReadWrite()
        .getRepository(BillingMembershipGrant)
        .update({ id: params.grantId }, { ends_at: params.endsAt });
      await new BillingEntitlementService().recompute(params.accountId);
    },
  };
}

/**
 * Copies a previous-app expiry file into legacy_import grants. The log line is counts
 * only; emails are written solely to the optional report file.
 */
export const billingImportLegacyMembershipExpiry = async (args: CommandLineArgs) => {
  if (hasOption(args, 'help')) {
    process.stdout.write(LEGACY_MEMBERSHIP_EXPIRY_HELP);
    return;
  }

  const fileArg = optionValue(args, 'file');
  if (fileArg === null) {
    throw new Error('Missing --file path. Run with --help for the input format.');
  }

  const filePath = resolve(fileArg);
  if (!existsSync(filePath)) {
    throw new Error(`Legacy membership file not found: ${filePath}`);
  }

  const reportArg = hasOption(args, 'report') ? optionValue(args, 'report') : null;
  if (hasOption(args, 'report') && reportArg === null) {
    throw new Error('Missing --report path.');
  }
  const reportPath = reportArg === null ? null : resolve(reportArg);
  const dryRun = hasOption(args, 'dry-run');

  const text = readFileSync(filePath, 'utf8');
  const result = await importLegacyMembershipExpiryFromText(
    text,
    legacyMembershipExpiryDeps(dryRun)
  );

  if (reportPath !== null) {
    writeFileSync(reportPath, formatLegacyMembershipImportReport(result.reportRows), 'utf8');
  }

  getLogger().info('Legacy membership expiry import finished', {
    dryRun,
    filePath,
    reportPath,
    ...result.counts,
  });
};
